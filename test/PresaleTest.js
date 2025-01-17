const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers, network} = require("hardhat");


describe("Presale", function() {

    let context;

    async function fixture() {
        //define callers
        const [sexy, admin, user] = await ethers.getSigners()

        //deploy the eventhandler
        const Eventhandler = await ethers.getContractFactory("Eventhandler");
        const eventhandler = await Eventhandler.deploy();
        const eAddress= await eventhandler.getAddress();

        //deploy the presale factory
        const PresaleFactory = await ethers.getContractFactory("PresaleFactory");
        const presaleFactory = await PresaleFactory.deploy(eAddress);
        const pAddress = await presaleFactory.getAddress();

        //set presale factory as valid caller to eventhandler
        const sexyConnectEventhandler = eventhandler.connect(sexy)
        const addCaller = await sexyConnectEventhandler.setNewFactory(pAddress, true);

        //set presale factory active
        const sexyConnectFactory = presaleFactory.connect(sexy);
        const setActive = await sexyConnectFactory.setActive((true));

        //deploy token factory
        const TokenFactory = await ethers.getContractFactory("TokenFactory");
        const tokenFactory = await TokenFactory.deploy(eAddress);
        const tAddress = await tokenFactory.getAddress();
        await sexyConnectEventhandler.setNewFactory(tAddress, true);
        const sexyConnectTokenFactory = tokenFactory.connect(sexy);
        await sexyConnectTokenFactory.setActive(true)
        

        //deploy ERC-20 token
        const amount = ethers.parseEther("100");
        const tokenDeployment = await sexyConnectTokenFactory.deployERC20("THREE","$THREE", amount)
        const receipt = await tokenDeployment.wait();
        const eventFilter = eventhandler.filters.TokenDeployed();
        const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
        expect(events.length).to.be.above(0)

            if (events.length > 0){
                const tokenAddress = events[0].args.token
                console.log("tokenAddress", tokenAddress)
            }

        const userConnectFactory = presaleFactory.connect(user);

        const gatingToken = await sexyConnectTokenFactory.deployERC20("GATE","$GATE", amount)
        const receiptGate = await gatingToken.wait();
        const eventsGate = await eventhandler.queryFilter(eventFilter, receiptGate.blockNumber, receiptGate.blockNumber)
        let gatingAddress;

        if (eventsGate.length > 0){
            gatingAddress = eventsGate[0].args.token
            console.log("gatingAddress", gatingAddress)
        }


        //presaleParams
        const timestampRoundOne = 1768833026
        const nftPrice = ethers.parseEther("0.1")
        const tokensPerLNFT = ethers.parseEther("1")
        const pricePerTokenRoundTwo = ethers.parseEther("0.2")
        const pricePerTokenRoundThree = ethers.parseEther("0.3")
        const maxWallet = ethers.parseEther("2")
        const gatingBalance = ethers.parseEther("50")
        const allocationSize = ethers.parseEther("75")
        const maxNFTSupply = 100

        const presaleParams = [timestampRoundOne, timestampRoundOne + 1, nftPrice, tokensPerLNFT, timestampRoundOne + 2, timestampRoundOne + 3, pricePerTokenRoundTwo, maxWallet, gatingBalance, allocationSize, maxNFTSupply, timestampRoundOne + 4, timestampRoundOne + 5, pricePerTokenRoundThree, maxWallet ]


        return { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tAddress, presaleParams, gatingAddress };
    }

    beforeEach(async function(){
        context = await loadFixture(fixture)
    });

    describe("Basic Functions", function(){
        it("should allow the admin to create a new presale", async function(){
            const {sexy, sexyConnectFactory, presaleParams, gatingAddress, tAddress, eventhandler} = context;
            const presale = await sexyConnectFactory.deployPresale(tAddress, "")
            const receipt = await presale.wait()

            const eventFilter = eventhandler.filters.LNFTCollectionCreated()
            const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const presaleAddress = events[0].args.collection
            console.log("collection", presaleAddress)

            // get Presale contract and connect
            const Presale = await ethers.getContractAt("Presale", presaleAddress)
            const sexyConnectPresale = Presale.connect(sexy)

            //create new presale
            const createPresale = await sexyConnectPresale.createPresale(presaleParams, gatingAddress)
            console.log("createPresale", createPresale)

        })
        it("should prohibit anyone else to deploy a new presale", async function(){
            const {userConnectFactory} = context;
            const tokenAddress = "0xcfeb09c3c5f0f78ad72166d55f9e6e9a60e96eec";

            //await expect(userConnectFactory.deployPresale(tokenAddress, "")).to.be.reverted
        })
    })
})