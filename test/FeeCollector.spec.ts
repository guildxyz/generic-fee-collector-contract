import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

function calculateFeeDistribution(collected: BigNumber, guildShareBps: BigNumber) {
  const guildAmount = collected.mul(guildShareBps).div(10000);
  const ownerAmount = collected.sub(guildAmount);
  return { guildAmount, ownerAmount };
}

// Test accounts
let wallet0: SignerWithAddress;
let owner: SignerWithAddress;
let randomWallet: SignerWithAddress;

// Sample collector details
let guildFeeCollector: SignerWithAddress;
const guildShareBps = BigNumber.from(469);

// Sample vault details
const fee = ethers.utils.parseEther("0.1");

// Contract instances
let token: Contract;
let feeCollector: Contract;

describe("FeeCollector", function () {
  this.beforeAll("get addresses", async () => {
    [wallet0, owner, guildFeeCollector, randomWallet] = await ethers.getSigners();
  });

  this.beforeEach("deploy new contracts", async () => {
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    feeCollector = await FeeCollector.deploy(guildFeeCollector.address, guildShareBps);

    const ERC20 = await ethers.getContractFactory("MockERC20");
    token = await ERC20.deploy();
  });

  context("creating a contract", async () => {
    it("should initialize fee collector addresses and fees", async () => {
      expect(await feeCollector.guildFeeCollector()).to.equal(guildFeeCollector.address);
      expect(await feeCollector.guildShareBps()).to.equal(guildShareBps);
    });
  });

  context("registering a vault", async () => {
    it("should store vault details", async () => {
      await feeCollector.registerVault(owner.address, token.address, true, fee);
      const vault = await feeCollector.getVault(0);
      expect(vault.owner).to.eq(owner.address);
      expect(vault.token).to.eq(token.address);
      expect(vault.multiplePayments).to.eq(true);
      expect(vault.fee).to.eq(fee);
    });

    it("should create more vaults when multicalled", async () => {
      await expect(feeCollector.getVault(0))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(0);
      await expect(feeCollector.getVault(1))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(1);

      await feeCollector.multicall([
        feeCollector.interface.encodeFunctionData("registerVault", [owner.address, token.address, false, fee]),
        feeCollector.interface.encodeFunctionData("registerVault", [
          owner.address,
          ethers.constants.AddressZero,
          false,
          fee
        ])
      ]);

      expect((await feeCollector.getVault(0)).token).to.eq(token.address);
      expect((await feeCollector.getVault(1)).token).to.eq(ethers.constants.AddressZero);
    });

    it("should emit a VaultRegistered event", async () => {
      const tx = feeCollector.registerVault(owner.address, token.address, false, fee);
      await expect(tx).to.emit(feeCollector, "VaultRegistered").withArgs("0", owner.address, token.address, fee);
    });
  });

  context("paying fees", async () => {
    beforeEach("register an ERC20 and an Ether vault", async () => {
      await feeCollector.registerVault(owner.address, token.address, false, fee);
      await feeCollector.registerVault(owner.address, ethers.constants.AddressZero, true, fee);
      await token.approve(feeCollector.address, ethers.constants.MaxUint256);
    });

    it("should revert if the vault does not exist", async () => {
      await expect(feeCollector.payFee("420"))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(420);
      await expect(feeCollector.payFee("69", { value: fee }))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(69);
    });

    it("should revert if multiple payments aren't enabled, but the sender attempts to pay repeatedly", async () => {
      await feeCollector.payFee("0");
      await expect(feeCollector.payFee("0"))
        .to.be.revertedWithCustomError(feeCollector, "AlreadyPaid")
        .withArgs(0, wallet0.address);
    });

    it("should allow multiple payments when they are enabled", async () => {
      await feeCollector.payFee("1", { value: fee });
      const tx = await feeCollector.payFee("1", { value: fee });
      expect((await tx.wait()).status).to.eq(1);
    });

    it("should save the paid amount and set paid state for the account", async () => {
      const vaultDetails0 = await feeCollector.getVault("0");
      await feeCollector.payFee("0");
      const vaultDetails1 = await feeCollector.getVault("0");
      const hasPaid = await feeCollector.hasPaid("0", wallet0.address);
      expect(vaultDetails1.collected).to.eq(vaultDetails0.collected.add(fee));
      expect(hasPaid).to.eq(true);

      const vaultDetails0a = await feeCollector.getVault("1");
      await feeCollector.payFee("1", { value: fee });
      const vaultDetails1a = await feeCollector.getVault("1");
      const hasPaida = await feeCollector.hasPaid("1", wallet0.address);
      expect(vaultDetails1a.collected).to.eq(vaultDetails0a.collected.add(fee));
      expect(hasPaida).to.eq(true);
    });

    it("should accept Ether and transfer it", async () => {
      const oldBalance = await ethers.provider.getBalance(feeCollector.address);
      await feeCollector.payFee("1", { value: fee });
      const newBalance = await ethers.provider.getBalance(feeCollector.address);
      expect(newBalance.sub(oldBalance)).to.eq(fee);
    });

    it("should revert if an Ether payment has the incorrect amount", async () => {
      await expect(feeCollector.payFee("1", { value: 42 }))
        .to.be.revertedWithCustomError(feeCollector, "IncorrectFee")
        .withArgs(1, 42, fee);
      await expect(feeCollector.payFee("1"))
        .to.be.revertedWithCustomError(feeCollector, "IncorrectFee")
        .withArgs(1, 0, fee);
    });

    it("should accept ERC20 and transfer it", async () => {
      const contractBalance0 = await token.balanceOf(feeCollector.address);
      const eoaBalance0 = await token.balanceOf(wallet0.address);
      await feeCollector.payFee("0");
      const contractBalance1 = await token.balanceOf(feeCollector.address);
      const eoaBalance1 = await token.balanceOf(wallet0.address);
      expect(contractBalance1).to.eq(contractBalance0.add(fee));
      expect(eoaBalance1).to.eq(eoaBalance0.sub(fee));
    });

    it("should revert if transaction value is non-zero when paying with ERC20", async () => {
      await expect(feeCollector.payFee("0", { value: 555 }))
        .to.be.revertedWithCustomError(feeCollector, "IncorrectFee")
        .withArgs(0, 555, 0);
    });

    it("should revert if token transfer returns false", async () => {
      const BadERC20 = await ethers.getContractFactory("MockBadERC20");
      const badToken = await BadERC20.deploy();
      await feeCollector.registerVault(owner.address, badToken.address, false, fee);
      await badToken.approve(feeCollector.address, ethers.constants.MaxUint256);
      await expect(feeCollector.payFee("2"))
        .to.be.revertedWithCustomError(feeCollector, "TransferFailed")
        .withArgs(wallet0.address, feeCollector.address);
    });

    it("should emit a FeeReceived event", async () => {
      const tx = feeCollector.payFee("0");
      await expect(tx).to.emit(feeCollector, "FeeReceived").withArgs("0", wallet0.address, fee);
    });
  });

  context("withdrawing collected fees", async () => {
    beforeEach("register an ERC20 and an Ether vault", async () => {
      await feeCollector.registerVault(owner.address, token.address, false, fee);
      await feeCollector.registerVault(owner.address, ethers.constants.AddressZero, false, fee);
      await token.approve(feeCollector.address, ethers.constants.MaxUint256);
      await feeCollector.payFee("0");
      await feeCollector.payFee("1", { value: fee });
    });

    it("should revert if the vault does not exist", async () => {
      await expect(feeCollector.withdraw("42"))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(42);
    });

    it("should set the collected amount to zero", async () => {
      const vaultDetails0 = await feeCollector.getVault("0");
      await feeCollector.withdraw("0");
      const vaultDetails1 = await feeCollector.getVault("0");
      expect(vaultDetails0.collected).to.not.eq("0");
      expect(vaultDetails1.collected).to.eq("0");
    });

    it("should transfer Ether fees proportionately", async () => {
      const fees = calculateFeeDistribution((await feeCollector.getVault("0")).collected, guildShareBps);

      const oldContractBalance = await ethers.provider.getBalance(feeCollector.address);
      const oldGuildFeeCollectorBalance = await ethers.provider.getBalance(guildFeeCollector.address);
      const OldOwnerFeeCollectorBalance = await ethers.provider.getBalance(owner.address);
      await feeCollector.withdraw("1");
      const newContractBalance = await ethers.provider.getBalance(feeCollector.address);
      const newGuildFeeCollectorBalance = await ethers.provider.getBalance(guildFeeCollector.address);
      const newOwnerFeeCollectorBalance = await ethers.provider.getBalance(owner.address);

      expect(oldContractBalance.sub(newContractBalance)).to.eq(fee);
      expect(newGuildFeeCollectorBalance.sub(oldGuildFeeCollectorBalance)).to.eq(fees.guildAmount);
      expect(newOwnerFeeCollectorBalance.sub(OldOwnerFeeCollectorBalance)).to.eq(fees.ownerAmount);
    });

    it("should transfer ERC20 fees proportionately", async () => {
      const collectedFees = (await feeCollector.getVault("0")).collected;
      const fees = calculateFeeDistribution(collectedFees, guildShareBps);

      const contractBalance0 = await token.balanceOf(feeCollector.address);
      const guildFeeCollectorBalance0 = await token.balanceOf(guildFeeCollector.address);
      const ownerBalance0 = await token.balanceOf(owner.address);
      await feeCollector.withdraw("0");
      const contractBalance1 = await token.balanceOf(feeCollector.address);
      const guildFeeCollectorBalance1 = await token.balanceOf(guildFeeCollector.address);
      const ownerBalance1 = await token.balanceOf(owner.address);

      expect(contractBalance1).to.eq(contractBalance0.sub(collectedFees));
      expect(guildFeeCollectorBalance1).to.eq(guildFeeCollectorBalance0.add(fees.guildAmount));
      expect(ownerBalance1).to.eq(ownerBalance0.add(fees.ownerAmount));
    });

    it("should emit a Withdrawn event", async () => {
      const fees = calculateFeeDistribution((await feeCollector.getVault("0")).collected, guildShareBps);

      const tx = feeCollector.withdraw("0");
      await expect(tx).to.emit(feeCollector, "Withdrawn").withArgs("0", fees.guildAmount, fees.ownerAmount);
    });
  });

  context("editing vaults", async () => {
    beforeEach("register an ERC20 and an Ether vault", async () => {
      await feeCollector.registerVault(owner.address, token.address, false, fee);
      await feeCollector.registerVault(owner.address, ethers.constants.AddressZero, false, fee);
    });

    it("should revert if the the vault does not exist", async () => {
      await expect(feeCollector.setVaultDetails("69", wallet0.address, false, 0))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(69);
    });

    it("should revert if the caller is not the vaults owner", async () => {
      const vault = await feeCollector.getVault(0);
      await expect(feeCollector.setVaultDetails(0, randomWallet.address, false, 0))
        .to.be.revertedWithCustomError(feeCollector, "AccessDenied")
        .withArgs(wallet0.address, vault.owner);
    });

    it("should change values", async () => {
      const vaultBefore = await feeCollector.getVault(1);
      await feeCollector.connect(owner).setVaultDetails(1, randomWallet.address, true, 420);
      const vaultAfter = await feeCollector.getVault(1);
      expect(vaultAfter.owner).to.eq(randomWallet.address);
      expect(vaultAfter.multiplePayments).to.eq(true);
      expect(vaultAfter.fee).to.eq(420);
      expect(vaultAfter.token).to.eq(vaultBefore.token);
      expect(vaultAfter.collected).to.eq(vaultBefore.collected);
    });

    it("should emit a VaultDetailsChanged event", async () => {
      const tx = feeCollector.connect(owner).setVaultDetails(0, randomWallet.address, true, 420);
      await expect(tx).to.emit(feeCollector, "VaultDetailsChanged").withArgs(0);
    });
  });

  context("setting the fee collector and it's share", async () => {
    context("Guild's fee collector", async () => {
      it("should revert if it's attempted to be changed by anyone else", async () => {
        await expect(feeCollector.setGuildFeeCollector(randomWallet.address))
          .to.be.revertedWithCustomError(feeCollector, "AccessDenied")
          .withArgs(wallet0.address, guildFeeCollector.address);
      });

      it("should change the address", async () => {
        await feeCollector.connect(guildFeeCollector).setGuildFeeCollector(randomWallet.address);
        const newAddress = await feeCollector.guildFeeCollector();
        expect(newAddress).to.eq(randomWallet.address);
      });

      it("should emit a GuildFeeCollectorChanged event", async () => {
        const tx = feeCollector.connect(guildFeeCollector).setGuildFeeCollector(randomWallet.address);
        await expect(tx).to.emit(feeCollector, "GuildFeeCollectorChanged").withArgs(randomWallet.address);
      });
    });

    context("Guild's share", async () => {
      it("should revert if it's attempted to be changed by anyone else", async () => {
        await expect(feeCollector.setGuildShareBps("100"))
          .to.be.revertedWithCustomError(feeCollector, "AccessDenied")
          .withArgs(wallet0.address, guildFeeCollector.address);
      });

      it("should change the value", async () => {
        await feeCollector.connect(guildFeeCollector).setGuildShareBps("100");
        const newValue = await feeCollector.guildShareBps();
        expect(newValue).to.eq("100");
      });

      it("should emit a GuildShareBpsChanged event", async () => {
        const tx = feeCollector.connect(guildFeeCollector).setGuildShareBps("100");
        await expect(tx).to.emit(feeCollector, "GuildShareBpsChanged").withArgs("100");
      });
    });
  });
});
