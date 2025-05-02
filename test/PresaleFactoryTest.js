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
        const presaleFactory = await PresaleFactory.deploy(eAddress, nftContractAddress, sexy.address, eAddress);
        const pAddress = await presaleFactory.getAddress();

        const sexyConnectEventhandler = eventhandler.connect(sexy)

         //deploy token factory
         const TokenFactory = await ethers.getContractFactory("TokenFactory");
         const tokenFactory = await TokenFactory.deploy(eAddress);
         const tokenFactoryAddress = await tokenFactory.getAddress();
         await sexyConnectEventhandler.setNewFactory(tokenFactoryAddress, true);
         const sexyConnectTokenFactory = tokenFactory.connect(sexy);
         await sexyConnectTokenFactory.setActive(true)
 
         
         //deploy Presale token
         const amount = ethers.parseEther("300000000");
         const userAmount = ethers.parseEther("100000")
         const tokenDeployment = await sexyConnectTokenFactory.deployERC20("PRESALE","$PRESALE", amount)
         const receipt = await tokenDeployment.wait();
         const eventFilter = eventhandler.filters.TokenDeployed();
         const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
         expect(events.length).to.be.above(0)
 
         let tokenAddress
 
             if (events.length > 0){
                 tokenAddress = events[0].args.token
                 console.log("tokenAddress", tokenAddress)
             }
         

        //set presale factory as valid caller to eventhandler
        const addCaller = await sexyConnectEventhandler.setNewFactory(pAddress, true);

        const sexyConnectFactory = presaleFactory.connect(sexy);
        const userConnectFactory = presaleFactory.connect(user);
        const zeroAddress ="0x0000000000000000000000000000000000000000"

        
        return {tokenAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory, zeroAddress };
    }

    beforeEach(async function(){
        context = await loadFixture(fixture)
    });

    describe("Basic Functions", function(){
        it("should allow the admin to deploy a presale contract", async function(){
            const {sexy, sexyConnectFactory, tAddress, presaleParams,tokenAddress} = context;

            await expect(sexyConnectFactory.deployPresale(tokenAddress, "")).to.not.be.reverted

        })
        it("should revert when a tokenAddress is the zero address", async function(){
            const {sexy, sexyConnectFactory, tAddress, presaleParams, zeroAddress,tokenAddress} = context;

            await expect(sexyConnectFactory.deployPresale(zeroAddress, "")).to.be.reverted

        })
        it("should prohibit anyone else to deploy a new presale contract", async function(){
            const {userConnectFactory} = context;
            const tokenAddress = "0xcfeb09c3c5f0f78ad72166d55f9e6e9a60e96eec";

            await expect(userConnectFactory.deployPresale(tokenAddress, "")).to.be.reverted

        })
    })
})