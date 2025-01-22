const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers, network} = require("hardhat");


describe("PresaleFactory", function() {

    let context;

    async function fixture() {
        //define callers
        const [sexy, admin, user] = await ethers.getSigners()

        //spoof NFT contract
        const NFTContract = await ethers.getContractFactory("D3NFT")
        const userConnectNFTFactory = NFTContract.connect(user)
        const nftContract = await userConnectNFTFactory.deploy("d3", "d3")
        const nftContractAddress = await nftContract.getAddress()

        //deploy the eventhandler
        const Eventhandler = await ethers.getContractFactory("Eventhandler");
        const eventhandler = await Eventhandler.deploy();
        const eAddress= await eventhandler.getAddress();

        //deploy the presale factory
        const PresaleFactory = await ethers.getContractFactory("PresaleFactory");
        const presaleFactory = await PresaleFactory.deploy(eAddress, nftContractAddress);
        const pAddress = await presaleFactory.getAddress();

        //set presale factory as valid caller to eventhandler
        const sexyConnectEventhandler = eventhandler.connect(sexy)
        const addCaller = await sexyConnectEventhandler.setNewFactory(pAddress, true);

        //set presale factory active
        const sexyConnectFactory = presaleFactory.connect(sexy);
        const setActive = await sexyConnectFactory.setActive((true));

        const userConnectFactory = presaleFactory.connect(user);

        
        return { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory,  };
    }

    beforeEach(async function(){
        context = await loadFixture(fixture)
    });

    describe("Basic Functions", function(){
        it("should allow the admin to deploy a presale contract", async function(){
            const {sexy, sexyConnectFactory, tAddress, presaleParams} = context;
            const tokenAddress = "0xcfeb09c3c5f0f78ad72166d55f9e6e9a60e96eec";

            await expect(sexyConnectFactory.deployPresale(tokenAddress, "")).to.not.be.reverted

        })
        it("should prohibit anyone else to deploy a new presale contract", async function(){
            const {userConnectFactory} = context;
            const tokenAddress = "0xcfeb09c3c5f0f78ad72166d55f9e6e9a60e96eec";

            await expect(userConnectFactory.deployPresale(tokenAddress, "")).to.be.reverted

        })
    })
})