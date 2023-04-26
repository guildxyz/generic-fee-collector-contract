import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

/**
 * @returns In order: partner amounts as in the schema, Guild's amount, the vault owner's amount.
 */
function calculateFeeDistribution(
  totalAmount: BigNumber,
  totalFeeBps: BigNumber,
  schema: {
    treasury: string;
    feeShareBps: BigNumber;
  }[]
): BigNumber[] {
  const fees = [];

  // Royalty is truncated - the remainder goes to the owner.
  const royaltyAmount = totalAmount.mul(totalFeeBps).div(10000);
  let guildAmount = royaltyAmount;

  // Calculate fees for partners.
  schema.forEach((elem) => {
    const partnerAmount = royaltyAmount.mul(elem.feeShareBps).div(10000);
    fees.push(partnerAmount);
    guildAmount = guildAmount.sub(partnerAmount);
  });

  // Calculate fees for Guild and the vault owner.
  fees.push(guildAmount);
  fees.push(totalAmount.sub(royaltyAmount));

  return fees;
}

// Test accounts
let wallet0: SignerWithAddress;
let owner: SignerWithAddress;
let anotherTreasury: SignerWithAddress;
let randomWallet: SignerWithAddress;

// Sample collector details
let guildTreasury: SignerWithAddress;
const totalFeeBps = BigNumber.from(469);

// Sample vault details
const fee = ethers.utils.parseEther("0.1");

// Contract instances
let token: Contract;
let feeCollector: Contract;

describe("FeeCollector", () => {
  before("get addresses", async () => {
    [wallet0, owner, guildTreasury, anotherTreasury, randomWallet] = await ethers.getSigners();
  });

  beforeEach("deploy new contracts", async () => {
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    feeCollector = await FeeCollector.deploy(guildTreasury.address, totalFeeBps);

    const ERC20 = await ethers.getContractFactory("MockERC20");
    token = await ERC20.deploy();
  });

  context("creating a contract", () => {
    it("should initialize fee collector addresses and fees", async () => {
      expect(await feeCollector.guildTreasury()).to.equal(guildTreasury.address);
      expect(await feeCollector.totalFeeBps()).to.equal(totalFeeBps);
    });
  });

  context("adding a feeSchema", () => {
    it("should revert when the caller is not the owner", async () => {
      await expect(feeCollector.connect(randomWallet).addFeeSchema("schema", [])).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should add an empty schema", async () => {
      const schema: [] = [];
      await feeCollector.addFeeSchema("schema", schema);
      const feeSchema = await feeCollector.getFeeSchema("schema");
      expect(feeSchema).to.deep.eq(schema);
    });

    it("should add a schema with multiple items", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(4200) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(5800) }
      ];

      await feeCollector.addFeeSchema("schema", schema);

      const feeSchema = await feeCollector.getFeeSchema("schema");
      const convertedSchema = feeSchema.map((elem: any) => {
        const converted = { ...elem };
        const numOfKeys = Object.keys(converted).length;
        for (let i = 0; i < numOfKeys / 2; i += 1) {
          delete converted[i];
        }
        return converted;
      });

      expect(convertedSchema).to.deep.eq(schema);
    });

    it("should emit a FeeSchemaAdded event", async () => {
      await expect(feeCollector.addFeeSchema("schema", [])).to.emit(feeCollector, "FeeSchemaAdded").withArgs("schema");
    });
  });

  context("registering a vault", () => {
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
      await expect(tx).to.emit(feeCollector, "VaultRegistered").withArgs(0, owner.address, token.address, fee);
    });
  });

  context("paying fees", () => {
    beforeEach("register an ERC20 and an Ether vault", async () => {
      await feeCollector.registerVault(owner.address, token.address, false, fee);
      await feeCollector.registerVault(owner.address, ethers.constants.AddressZero, true, fee);
      await token.approve(feeCollector.address, ethers.constants.MaxUint256);
    });

    it("should revert if the vault does not exist", async () => {
      await expect(feeCollector.payFee(420))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(420);
      await expect(feeCollector.payFee(69, { value: fee }))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(69);
    });

    it("should revert if multiple payments aren't enabled, but the sender attempts to pay repeatedly", async () => {
      await feeCollector.payFee(0);
      await expect(feeCollector.payFee(0))
        .to.be.revertedWithCustomError(feeCollector, "AlreadyPaid")
        .withArgs(0, wallet0.address);
    });

    it("should allow multiple payments when they are enabled", async () => {
      await feeCollector.payFee(1, { value: fee });
      const tx = await feeCollector.payFee(1, { value: fee });
      expect((await tx.wait()).status).to.eq(1);
    });

    it("should save the paid amount and set paid state for the account", async () => {
      const vaultDetails0 = await feeCollector.getVault(0);
      await feeCollector.payFee(0);
      const vaultDetails1 = await feeCollector.getVault(0);
      const hasPaid = await feeCollector.hasPaid(0, wallet0.address);
      expect(vaultDetails1.balance).to.eq(vaultDetails0.balance.add(fee));
      expect(hasPaid).to.eq(true);

      const vaultDetails0a = await feeCollector.getVault(1);
      await feeCollector.payFee(1, { value: fee });
      const vaultDetails1a = await feeCollector.getVault(1);
      const hasPaida = await feeCollector.hasPaid(1, wallet0.address);
      expect(vaultDetails1a.balance).to.eq(vaultDetails0a.balance.add(fee));
      expect(hasPaida).to.eq(true);
    });

    it("should accept Ether and transfer it", async () => {
      const oldBalance = await ethers.provider.getBalance(feeCollector.address);
      await feeCollector.payFee(1, { value: fee });
      const newBalance = await ethers.provider.getBalance(feeCollector.address);
      expect(newBalance.sub(oldBalance)).to.eq(fee);
    });

    it("should revert if an Ether payment has the incorrect amount", async () => {
      await expect(feeCollector.payFee(1, { value: 42 }))
        .to.be.revertedWithCustomError(feeCollector, "IncorrectFee")
        .withArgs(1, 42, fee);
      await expect(feeCollector.payFee(1))
        .to.be.revertedWithCustomError(feeCollector, "IncorrectFee")
        .withArgs(1, 0, fee);
    });

    it("should accept ERC20 and transfer it", async () => {
      await expect(feeCollector.payFee(0)).to.changeTokenBalances(token, [feeCollector, wallet0], [fee, fee.mul(-1)]);
    });

    it("should revert if transaction value is non-zero when paying with ERC20", async () => {
      await expect(feeCollector.payFee(0, { value: 555 }))
        .to.be.revertedWithCustomError(feeCollector, "IncorrectFee")
        .withArgs(0, 555, 0);
    });

    it("should revert if token transfer returns false", async () => {
      const BadERC20 = await ethers.getContractFactory("MockBadERC20");
      const badToken = await BadERC20.deploy();
      await feeCollector.registerVault(owner.address, badToken.address, false, fee);
      await badToken.approve(feeCollector.address, ethers.constants.MaxUint256);
      await expect(feeCollector.payFee(2))
        .to.be.revertedWithCustomError(feeCollector, "TransferFailed")
        .withArgs(wallet0.address, feeCollector.address);
    });

    it("should emit a FeeReceived event", async () => {
      const tx = feeCollector.payFee(0);
      await expect(tx).to.emit(feeCollector, "FeeReceived").withArgs(0, wallet0.address, fee);
    });
  });

  context("withdrawing collected fees", () => {
    beforeEach("register an ERC20 and an Ether vault", async () => {
      await feeCollector.addFeeSchema("guild", []);
      await feeCollector.registerVault(owner.address, token.address, false, fee);
      await feeCollector.registerVault(owner.address, ethers.constants.AddressZero, false, fee);
      await token.approve(feeCollector.address, ethers.constants.MaxUint256);
      await feeCollector.payFee(0);
      await feeCollector.payFee(1, { value: fee });
    });

    it("should revert if the vault does not exist", async () => {
      await expect(feeCollector.withdraw(42, "guild"))
        .to.be.revertedWithCustomError(feeCollector, "VaultDoesNotExist")
        .withArgs(42);
    });

    it("should set the vault's balance to zero", async () => {
      const vaultDetails0 = await feeCollector.getVault(0);
      await feeCollector.withdraw(0, "guild");
      const vaultDetails1 = await feeCollector.getVault(0);
      expect(vaultDetails0.balance).to.not.eq(0);
      expect(vaultDetails1.balance).to.eq(0);
    });

    it("should transfer Ether fees proportionately - empty schema", async () => {
      const fees = calculateFeeDistribution((await feeCollector.getVault(0)).balance, totalFeeBps, []);

      await expect(feeCollector.withdraw(1, "guild")).to.changeEtherBalances(
        [feeCollector, guildTreasury, owner],
        [fee.mul(-1), ...fees]
      );
    });

    it("should transfer Ether fees proportionately - schema with multiple items", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(2300) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(2700) }
      ];
      await feeCollector.addFeeSchema("anotherSchema", schema);

      const fees = calculateFeeDistribution((await feeCollector.getVault(0)).balance, totalFeeBps, schema);

      await expect(feeCollector.withdraw(1, "anotherSchema")).to.changeEtherBalances(
        [feeCollector, randomWallet, anotherTreasury, guildTreasury, owner],
        [fee.mul(-1), ...fees]
      );
    });

    it("should transfer Ether fees proportionately - schema with multiple items, no fee for Guild", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(4200) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(5800) }
      ];
      await feeCollector.addFeeSchema("anotherSchema", schema);

      const fees = calculateFeeDistribution((await feeCollector.getVault(0)).balance, totalFeeBps, schema);

      await expect(feeCollector.withdraw(1, "anotherSchema")).to.changeEtherBalances(
        [feeCollector, randomWallet, anotherTreasury, guildTreasury, owner],
        [fee.mul(-1), ...fees]
      );
    });

    it("should fail to transfer Ether when the fees exceed the total fee", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(4200) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(6900) }
      ];
      await feeCollector.addFeeSchema("anotherSchema", schema);

      // eslint-disable-next-line no-unused-expressions
      expect(feeCollector.withdraw(1, "anotherSchema")).to.be.revertedWithPanic;
    });

    it("should transfer ERC20 fees proportionately - empty schema", async () => {
      const collectedFees = (await feeCollector.getVault(0)).balance;
      const fees = calculateFeeDistribution(collectedFees, totalFeeBps, []);

      await expect(feeCollector.withdraw(0, "guild")).to.changeTokenBalances(
        token,
        [feeCollector, guildTreasury, owner],
        [collectedFees.mul(-1), ...fees]
      );
    });

    it("should transfer ERC20 fees proportionately - schema with multiple items", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(2300) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(2700) }
      ];
      await feeCollector.addFeeSchema("anotherSchema", schema);

      const collectedFees = (await feeCollector.getVault(0)).balance;
      const fees = calculateFeeDistribution(collectedFees, totalFeeBps, schema);

      await expect(feeCollector.withdraw(0, "anotherSchema")).to.changeTokenBalances(
        token,
        [feeCollector, randomWallet, anotherTreasury, guildTreasury, owner],
        [collectedFees.mul(-1), ...fees]
      );
    });

    it("should transfer ERC20 fees proportionately - schema with multiple items, no fee for Guild", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(4200) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(5800) }
      ];
      await feeCollector.addFeeSchema("anotherSchema", schema);

      const collectedFees = (await feeCollector.getVault(0)).balance;
      const fees = calculateFeeDistribution(collectedFees, totalFeeBps, schema);

      await expect(feeCollector.withdraw(0, "anotherSchema")).to.changeTokenBalances(
        token,
        [feeCollector, randomWallet, anotherTreasury, guildTreasury, owner],
        [collectedFees.mul(-1), ...fees]
      );
    });

    it("should fail to transfer ERC20 when the fees exceed the total fee", async () => {
      const schema = [
        { treasury: randomWallet.address, feeShareBps: BigNumber.from(4200) },
        { treasury: anotherTreasury.address, feeShareBps: BigNumber.from(6900) }
      ];
      await feeCollector.addFeeSchema("anotherSchema", schema);

      // eslint-disable-next-line no-unused-expressions
      expect(feeCollector.withdraw(0, "anotherSchema")).to.be.revertedWithPanic;
    });

    it("should emit a Withdrawn event", async () => {
      const tx = feeCollector.withdraw(0, "guild");
      await expect(tx).to.emit(feeCollector, "Withdrawn").withArgs(0);
    });
  });

  context("editing vaults", () => {
    beforeEach("register an ERC20 and an Ether vault", async () => {
      await feeCollector.registerVault(owner.address, token.address, false, fee);
      await feeCollector.registerVault(owner.address, ethers.constants.AddressZero, false, fee);
    });

    it("should revert if the the vault does not exist", async () => {
      await expect(feeCollector.setVaultDetails(69, wallet0.address, false, 0))
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
      expect(vaultAfter.balance).to.eq(vaultBefore.balance);
    });

    it("should emit a VaultDetailsChanged event", async () => {
      const tx = feeCollector.connect(owner).setVaultDetails(0, randomWallet.address, true, 420);
      await expect(tx).to.emit(feeCollector, "VaultDetailsChanged").withArgs(0);
    });
  });

  context("setting the fee collector and it's share", () => {
    context("Guild's fee collector", () => {
      it("should revert if it's attempted to be changed by anyone else", async () => {
        await expect(feeCollector.connect(randomWallet).setGuildTreasury(randomWallet.address)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("should change the address", async () => {
        await feeCollector.connect(wallet0).setGuildTreasury(randomWallet.address);
        const newAddress = await feeCollector.guildTreasury();
        expect(newAddress).to.eq(randomWallet.address);
      });

      it("should emit a GuildTreasuryChanged event", async () => {
        const tx = feeCollector.connect(wallet0).setGuildTreasury(randomWallet.address);
        await expect(tx).to.emit(feeCollector, "GuildTreasuryChanged").withArgs(randomWallet.address);
      });
    });

    context("Guild's share", () => {
      it("should revert if it's attempted to be changed by anyone else", async () => {
        await expect(feeCollector.connect(randomWallet).setTotalFeeBps(100)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("should change the value", async () => {
        await feeCollector.setTotalFeeBps(100);
        const newValue = await feeCollector.totalFeeBps();
        expect(newValue).to.eq(100);
      });

      it("should emit a TotalFeeBpsChanged event", async () => {
        const tx = feeCollector.setTotalFeeBps(100);
        await expect(tx).to.emit(feeCollector, "TotalFeeBpsChanged").withArgs(100);
      });
    });
  });
});
