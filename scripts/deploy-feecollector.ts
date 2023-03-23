import { ethers } from "hardhat";

// Constructor arguments
const guildTreasury = "0x..."; // The address that will receive Guild's share from the funds.
const totalFeeBps = 0; // The percentage of Guild's share expressed in basis points (e.g 500 for a 5% cut).

async function main() {
  const FeeCollector = await ethers.getContractFactory("FeeCollector");
  const feeCollector = await FeeCollector.deploy(guildTreasury, totalFeeBps);

  console.log(
    `Deploying contract to ${
      ethers.provider.network.name !== "unknown" ? ethers.provider.network.name : ethers.provider.network.chainId
    }...`
  );

  await feeCollector.deployed();

  console.log("FeeCollector deployed to:", feeCollector.address);
  console.log("Constructor arguments:", guildTreasury, totalFeeBps);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
