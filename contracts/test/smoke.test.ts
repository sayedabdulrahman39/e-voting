import { expect } from "chai";
import { ethers } from "hardhat";

describe("Contracts Environment Smoke Test (Phase 0)", function () {
  it("Should connect to Hardhat local provider and list accounts", async function () {
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(0);
    const balance = await ethers.provider.getBalance(signers[0].address);
    expect(balance).to.be.greaterThan(0n);
  });
});
