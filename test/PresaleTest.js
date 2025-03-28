const {
    time,
    loadFixture,
    helpers
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const {ethers, network} = require("hardhat");



describe("Presale", function() {

    let context;

    async function fixture() {
        //define callers
        const [sexy, admin, user] = await ethers.getSigners()

        //const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" base mainnet

        //spoof NFT contract
        const NFTContract = await ethers.getContractFactory("D3NFT")
        const userConnectNFTFactory = NFTContract.connect(user)
        const nftContract = await userConnectNFTFactory.deploy("d3", "d3")
        const nftContractAddress = await nftContract.getAddress()
        //console.log("nft contract address", nftContractAddress)
        const nftBalance = await nftContract.connect(user).balanceOf(user)
        const userConnectNFT = nftContract.connect(user)
        //console.log("nft balance", nftBalance)

        //get some addresses
        const sexyAddress = await sexy.getAddress()
        const userAddress = await user.getAddress()
        const adminAddress = await admin.getAddress()

        //console.log("sexy address", sexyaddress)

        //deploy the eventhandler
        const Eventhandler = await ethers.getContractFactory("Eventhandler");
        const eventhandler = await Eventhandler.deploy();
        const eAddress = await eventhandler.getAddress();

        //deploy usdc with 6 decimals
        const receivers = [sexyAddress, adminAddress, userAddress]
        const amountUSDC = ethers.parseUnits("100000",6)
        const USDC = await ethers.getContractFactory("USDC")
        const usdc = await USDC.deploy(receivers, amountUSDC, "USDC", "USDC") 
        const usdcAddress = await usdc.getAddress()
        

        //deploy the presale factory
        const PresaleFactory = await ethers.getContractFactory("PresaleFactory");
        const presaleFactory = await PresaleFactory.deploy(eAddress, nftContractAddress, sexyAddress, usdcAddress);
        const presaleFactoryAddress = await presaleFactory.getAddress();

        //set presale factory as valid caller to eventhandler
        const sexyConnectEventhandler = eventhandler.connect(sexy)
        const addCaller = await sexyConnectEventhandler.setNewFactory(presaleFactoryAddress, true);

        //set presale factory active
        const sexyConnectFactory = presaleFactory.connect(sexy);

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
        
        //deploy Gating token
        const userConnectFactory = presaleFactory.connect(user);
        const gatingToken = await sexyConnectTokenFactory.deployERC20("GATE","$GATE", amount)
        const receiptGate = await gatingToken.wait();
        const eventsGate = await eventhandler.queryFilter(eventFilter, receiptGate.blockNumber, receiptGate.blockNumber)
        let gatingAddress;

        if (eventsGate.length > 0){
            gatingAddress = eventsGate[0].args.token
        }

        const gatingContract = await ethers.getContractAt("CustomERC20", gatingAddress)
        const transfer = await gatingContract.connect(sexy).transfer(user, userAmount)

        //deploy staking contract
        const StakingContract = await ethers.getContractFactory("D3Staking")
        const stakingContract = await StakingContract.deploy("dSTAKE", "$dSTAKE", gatingAddress)
        const stakingAddress = await stakingContract.getAddress()
        const userConnectStaking = stakingContract.connect(user)


        //presaleParams
        const timestampRoundOne = await time.latest() + 1000

        //const timestampRoundOne = 1768833026
        const nftPrice = ethers.parseUnits("500", 6)
        const tokensPerLNFT = ethers.parseEther("10000")
        const pricePerTokenRoundTwo = ethers.parseUnits("0.05", 6) //in USDC
        const pricePerTokenRoundThree = ethers.parseUnits("0.06", 6) //in USDC
        const maxWallet = ethers.parseEther("3000")
        const gatingBalance = ethers.parseEther("1000")
        const allocationSize = ethers.parseEther("10000000")
        const maxNFTSupply = 1000
        const softcap = ethers.parseUnits("12500", 6) //25 * 500 in USDC

        const presaleParams = [timestampRoundOne, timestampRoundOne + 100, nftPrice, tokensPerLNFT, timestampRoundOne + 200, timestampRoundOne + 300, pricePerTokenRoundTwo, maxWallet, gatingBalance, allocationSize, maxNFTSupply, timestampRoundOne + 400, timestampRoundOne + 500, pricePerTokenRoundThree, maxWallet, softcap ]

        //deploy a presale to work with
        const presale = await sexyConnectFactory.deployPresale(tokenAddress, "")
        const receiptPresale = await presale.wait()

        const eventFilterPresale = eventhandler.filters.LNFTCollectionCreated()
        const eventsPresale = await eventhandler.queryFilter(eventFilterPresale, receiptPresale.blockNumber, receiptPresale.blockNumber)
        const presaleAddress = eventsPresale[0].args.collection

        // get Presale contract and connect
        const Presale = await ethers.getContractAt("Presale", presaleAddress)
        const sexyConnectPresale = Presale.connect(sexy)

        //approve presale contract to spend tokens
        const TokenContract = await ethers.getContractAt("CustomERC20",tokenAddress)
        const sexyConnectToken = TokenContract.connect(sexy)
        await sexyConnectToken.approve(presaleAddress, presaleParams[9])
        
        //create new presale
        await sexyConnectPresale.createPresale(presaleParams, stakingAddress)

        //connect user to the presale
        const userConnectPresale = Presale.connect(user)

        //connect user to the token
        const userConnectToken = TokenContract.connect(user)

        //D3 NFT IDs owned by the user
        const tokenIDs = ["1", "2", "3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"]
        const falseTokenIDs = ["1", "2", "3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","200"]
        

        return {tokenIDs,falseTokenIDs, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, Presale, userConnectPresale, amount, userAmount, userConnectNFT, userAddress, sexyConnectPresale, userConnectToken, presaleAddress, stakingContract, userConnectStaking, stakingAddress, gatingToken, gatingContract,gatingBalance, Presale, usdc, pricePerTokenRoundTwo, pricePerTokenRoundThree, maxWallet};
    }

    beforeEach(async function(){
        context = await loadFixture(fixture)
    });

    describe("Presale Creation", function(){
        it("should allow the admin to create a new presale", async function(){
            const {sexy, sexyConnectFactory, presaleParams, gatingAddress, tokenFactoryAddress, eventhandler, tokenAddress} = context;
            const presale = await sexyConnectFactory.deployPresale(tokenAddress, "")
            const receipt = await presale.wait()

            const eventFilter = eventhandler.filters.LNFTCollectionCreated()
            const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const presaleAddress = events[0].args.collection

            // get Presale contract and connect
            const Presale = await ethers.getContractAt("Presale", presaleAddress)
            const sexyConnectPresale = Presale.connect(sexy)

            //approve presale contract to spend tokens
            const TokenContract = await ethers.getContractAt("CustomERC20",tokenAddress)
            const sexyConnectToken = TokenContract.connect(sexy)
            const approval = await sexyConnectToken.approve(presaleAddress, presaleParams[9])
            
            //create new presale
            await expect(sexyConnectPresale.createPresale(presaleParams, gatingAddress)).to.not.be.reverted

        })
        it("should prohibit anyone else to create a new presale", async function(){
            const {sexy, sexyConnectFactory, presaleParams, gatingAddress, tokenFactoryAddress, eventhandler, tokenAddress, user, userAmount} = context;
            const presale = await sexyConnectFactory.deployPresale(tokenAddress, "")
            const receipt = await presale.wait()

            const eventFilter = eventhandler.filters.LNFTCollectionCreated()
            const events = await eventhandler.queryFilter(eventFilter, receipt.blockNumber, receipt.blockNumber)
            const presaleAddress = events[0].args.collection
            //console.log("collection", presaleAddress)

            //get Presale contract and connect
            const Presale = await ethers.getContractAt("Presale", presaleAddress)
            const sexyConnectPresale = Presale.connect(sexy)

            //approve presale contract to spend tokens
            const TokenContract = await ethers.getContractAt("CustomERC20",tokenAddress)
            const sexyConnectToken = TokenContract.connect(sexy)
            await sexyConnectToken.transfer(user, userAmount)

            const userConnectToken = TokenContract.connect(user)
            const approval = await userConnectToken.approve(presaleAddress, userAmount)
            
            //create new presale
            const userConnectPresale = Presale.connect(user)
            await expect(userConnectPresale.createPresale(presaleParams, gatingAddress)).to.be.reverted
        })
    })

    describe("Round 1 Presale functions", function(){
        it("should allow a D3 NFT holder to buy an L-NFT", async function(){
            const { tokenIDs, sexy, admin, user, eventhandler, presaleFactory, presaleAddress, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress , usdc} = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount
            console.log("usdcAmount", usdcAmount)
            console.log("usdcAmount", ethers.formatUnits(usdcAmount, 6))

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);
        })
        it("should prohibit a user who does not hold a specific D3 NFT to mint an LNFT for this ID", async function(){
            const { tokenIDs, falseTokenIDs, sexy, admin, user, eventhandler, presaleFactory, presaleAddress, sexyConnectFactory, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress , usdc} = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 31
            const usdcAmount = String(presaleParams[2]) * amount
            console.log("usdcAmount", usdcAmount)
            console.log("usdcAmount", ethers.formatUnits(usdcAmount, 6))

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(0);
        }) 
        it("should allow an LNFT-Holder to withdraw after and receive the amount of tokens", async function(){
            const {presaleAddress, usdc, tokenIDs, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12] +10)
            await sexyConnectPresale.finalisePresale()

            //withdraw the the tokens by burning the LNFT
            const userWithdrawal = await userConnectPresale.withdrawTokensRoundOne(amount)
            const userNFTBalanceAfter = await userConnectPresale.balanceOf(userAddress, tokenID)

            expect(userNFTBalanceAfter).to.equal(0)

            //check if user received his presale tokens
            const userTokenBalance = await userConnectToken.balanceOf(userAddress)
            console.log("user token balance", ethers.formatEther(userTokenBalance))
            const formattedParams3 = ethers.formatEther(presaleParams[3].toString())
            const calculatedBalance = formattedParams3 * amount
            const parsedCalculatedBalance = ethers.parseEther(calculatedBalance.toString())
            expect(userTokenBalance).to.equal(parsedCalculatedBalance)
            console.log("amount user tokens calculated", calculatedBalance)
        })
        it("should track the LNFT-Supply correctly", async function(){
            const {tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);

            //check the current LNFT supply BEFORE the user burned them
            const lnftBalanceBefore = await userConnectPresale.currentNFTSupply()
            console.log("lnftBalanceBefore", lnftBalanceBefore)
            expect(lnftBalanceBefore).to.equal(amount)

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12] + 10)
            await sexyConnectPresale.finalisePresale()

            //withdraw the the tokens by burning the LNFT
            const userWithdrawal = await userConnectPresale.withdrawTokensRoundOne(amount)

            //check the current LNFT supply AFTER the user burned them
            const lnftBalanceAfter = await userConnectPresale.currentNFTSupply()
            console.log("lnftBalanceAfter", lnftBalanceAfter)
            expect(lnftBalanceAfter).to.equal(0)
        })
        /*it("should revert when the max LNFT-supply is to be exceeded", async function(){
            const { sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //mint 6 NFTs while the total siupply is set to 5
            await time.increaseTo(presaleParams[0])
            const tokenIDs = ["1","2","3","5","6","7"]
            const value = ethers.parseEther("0.6")
            expect(userConnectPresale.buyBatchLNFT(6, tokenIDs, {value: value})).to.be.revertedWithCustomError
        })*/
        it("should revert when round 1 is not live", async function (){
            const {tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //increase timestamp to just before round 1
            await time.increaseTo(presaleParams[0] - 10 )

            //set presale params
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount


            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.be.revertedWithCustomError

            //forward to after round 1
            await time.increaseTo(presaleParams[4])
            
            //buy round 1
            expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.be.revertedWithCustomError
        })
    })

    describe("Round 2 Presale functions", function(){
        it("should allow a staker with valid stake to buy tokens", async function(){
            const {pricePerTokenRoundTwo, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

            //user approves tokens
            const approval = await gatingContract.connect(user).approve(stakingAddress, gatingBalance)

            //user stakes tokens
            await expect(userConnectStaking.mint(gatingBalance)).to.not.be.reverted
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //approve presale Address
            const tokenPrice = ethers.formatUnits(pricePerTokenRoundTwo.toString(), 6)
            const max = ethers.formatEther(maxWallet.toString())
            const usdcAmount = ethers.parseUnits(String(tokenPrice * max), 6)

            await expect(usdc.connect(user).approve(presaleAddress, usdcAmount)).to.not.be.reverted

            await expect(userConnectPresale.buyRoundTwoAndThree(maxWallet, 2)).to.not.be.reverted

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            expect(presaleBalance).to.equal(maxWallet)
            console.log("presaleBalance", ethers.formatEther(presaleBalance))
            console.log("buy amount", ethers.formatEther(maxWallet))

        })
        it("should revert if a staker has an insufficient staking balance", async function(){
            const {pricePerTokenRoundTwo, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

            //user approves tokens
            const approval = await gatingContract.connect(user).approve(stakingAddress, gatingBalance)

            //user stakes tokens
            const one = ethers.parseEther("1")
            await expect(userConnectStaking.mint(gatingBalance - one)).to.not.be.reverted
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //approve presale Address
            const tokenPrice = ethers.formatUnits(pricePerTokenRoundTwo.toString(), 6)
            const max = ethers.formatEther(maxWallet.toString())
            const usdcAmount = ethers.parseUnits(String(tokenPrice * max), 6)

            expect(usdc.connect(user).approve(presaleAddress, usdcAmount)).to.not.be.reverted

            expect(userConnectPresale.buyRoundTwoAndThree(maxWallet, 2)).to.be.revertedWithCustomError

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            console.log("presaleBalance", ethers.formatEther(presaleBalance))
            console.log("buy amount", ethers.formatEther(maxWallet))
            //check presale Balance
          
            expect(presaleBalance).to.equal(0)
        })
        it("should revert if a staking timestamp is after the cutoff point", async function(){
            const {pricePerTokenRoundTwo, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

            //user approves tokens
            const approval = await gatingContract.connect(user).approve(stakingAddress, gatingBalance)

              //forward to round 2 start
              await time.increaseTo(presaleParams[4])

            //user stakes tokens
            const one = ethers.parseEther("1")
            await expect(userConnectStaking.mint(gatingBalance - one)).to.not.be.reverted
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //approve presale Address
            const tokenPrice = ethers.formatUnits(pricePerTokenRoundTwo.toString(), 6)
            const max = ethers.formatEther(maxWallet.toString())
            const usdcAmount = ethers.parseUnits(String(tokenPrice * max), 6)

            expect(usdc.connect(user).approve(presaleAddress, usdcAmount)).to.not.be.reverted

            expect(userConnectPresale.buyRoundTwoAndThree(maxWallet, 2)).to.be.revertedWithCustomError

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            console.log("presaleBalance", ethers.formatEther(presaleBalance))
            console.log("buy amount", ethers.formatEther(maxWallet))
          
            expect(presaleBalance).to.equal(0)
        })
        it("should allow a buyer to withdraw tokens", async function(){
            const {pricePerTokenRoundTwo, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context
            //ROUND 1 BUY TO CRACK SOFTCAP
            //user approves tokens
            const approval = await gatingContract.connect(user).approve(stakingAddress, gatingBalance)

            //user stakes tokens
            await expect(userConnectStaking.mint(gatingBalance)).to.not.be.reverted
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount1 = String(presaleParams[2]) * amount
            console.log("usdcAmount", usdcAmount1)
            console.log("usdcAmount", ethers.formatUnits(usdcAmount1, 6))

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount1)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted

            //ROUND 2 BUY
            //forward to round 2 start
            await time.increaseTo(presaleParams[4])

            //approve presale Address
            const tokenPrice = ethers.formatUnits(pricePerTokenRoundTwo.toString(), 6)
            const max = ethers.formatEther(maxWallet.toString())
            const usdcAmount = ethers.parseUnits(String(tokenPrice * max), 6)
            console.log("usdcAmount", ethers.formatUnits(usdcAmount.toString(), 6))
            await expect(usdc.connect(user).approve(presaleAddress, usdcAmount)).to.not.be.reverted

            await expect(userConnectPresale.buyRoundTwoAndThree(maxWallet, 2)).to.not.be.reverted

            //check presale Balance
            const presaleBalance = await userConnectPresale.balances(userAddress)
            expect(presaleBalance).to.equal(maxWallet)
            console.log("presaleBalance", ethers.formatEther(presaleBalance))
            console.log("buy amount", ethers.formatEther(maxWallet))

            await time.increaseTo(presaleParams[12] + 1)
            await sexyConnectPresale.finalisePresale()

            await expect(userConnectPresale.withdrawTokensRoundTwoAndThree(presaleBalance)).to.not.be.reverted
            const tokenBalance = await userConnectToken.balanceOf(userAddress)
            console.log("tokenBalance after withdrawal", ethers.formatEther(tokenBalance))
            const presaleBalanceAfter = await userConnectPresale.balances(userAddress)
            expect(presaleBalanceAfter).to.equal(0)
            expect(tokenBalance).to.equal(presaleBalance)


        })

    })
    describe("Round 3 Presale functions", function(){
        it("should allow any buyer to buy tokens", async function(){
            const {pricePerTokenRoundTwo, pricePerTokenRoundThree, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

            //forward to round 3 start
            await time.increaseTo(presaleParams[11])

            //approve presale Address
            const tokenPrice = ethers.formatUnits(pricePerTokenRoundThree.toString(), 6)
            const max = ethers.formatEther(maxWallet.toString())
            const usdcAmount = ethers.parseUnits(String(tokenPrice * max), 6)

            await expect(usdc.connect(user).approve(presaleAddress, usdcAmount)).to.not.be.reverted

            //buy round 3
            await expect(userConnectPresale.buyRoundTwoAndThree(maxWallet, 3)).to.not.be.reverted

            //check presale balance
            const userPresaleBalance = await userConnectPresale.balances(userAddress)
            console.log("Presale Balance", ethers.formatEther(userPresaleBalance.toString()))
            expect(userPresaleBalance).to.equal(maxWallet)

        })
        it("should allow a buyer to withdraw tokens", async function(){
            const {pricePerTokenRoundTwo, pricePerTokenRoundThree, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context
            
            //ROUND 1 BUY TO CRACK SOFTCAP
            //user approves tokens
            const approval = await gatingContract.connect(user).approve(stakingAddress, gatingBalance)

            //user stakes tokens
            await expect(userConnectStaking.mint(gatingBalance)).to.not.be.reverted
            const userStakedAmount = await userConnectStaking.balanceOf(userAddress)
            console.log("user staked amount", userStakedAmount)

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount1 = String(presaleParams[2]) * amount
            console.log("usdcAmount", usdcAmount1)
            console.log("usdcAmount", ethers.formatUnits(usdcAmount1, 6))

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount1)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted

            //forward to round 3 start
            await time.increaseTo(presaleParams[11])

            //approve presale Address
            const tokenPrice = ethers.formatUnits(pricePerTokenRoundThree.toString(), 6)
            const max = ethers.formatEther(maxWallet.toString())
            const usdcAmount = ethers.parseUnits(String(tokenPrice * max), 6)

            await expect(usdc.connect(user).approve(presaleAddress, usdcAmount)).to.not.be.reverted

            //buy round 3
            await expect(userConnectPresale.buyRoundTwoAndThree(maxWallet, 3)).to.not.be.reverted

            //check presale balance
            const userPresaleBalance = await userConnectPresale.balances(userAddress)
            console.log("Presale Balance before", ethers.formatEther(userPresaleBalance.toString()))
            expect(userPresaleBalance).to.equal(maxWallet)

            await time.increaseTo(presaleParams[12])
            await sexyConnectPresale.finalisePresale()

            await expect(userConnectPresale.withdrawTokensRoundTwoAndThree(maxWallet)).to.not.be.reverted

            //check user contract balance after withdrawal
            const contractBalance = await userConnectPresale.balances(userAddress)
            expect(contractBalance).to.equal(0)
            console.log("Presale Balance after", ethers.formatEther(contractBalance.toString()))

            //check user wallet balance after withdrawal
            const userBalance = await userConnectToken.balanceOf(userAddress)
            expect(userBalance).to.equal(maxWallet)
        })
        
    })
    describe("Presale Logic", function (){
        it("should track the allocationSize correctly", async function(){
            const {pricePerTokenRoundTwo, pricePerTokenRoundThree, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

           //ROUND 1 BUY TO CRACK SOFTCAP
            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount
            const formatted3 = ethers.formatEther(presaleParams[3])
            const tokenAmount = ethers.parseEther(String(formatted3 * amount))

            console.log("calculated tokenAmount of 30 NFTs", ethers.formatEther(tokenAmount))

            //check allocationSize BEFORE buy
            const allocationSizeBeforeBuy = await userConnectPresale.allocationSize()
            console.log("allocationSizeBeforeBuy", ethers.formatEther(allocationSizeBeforeBuy))
            expect(allocationSizeBeforeBuy).to.equal(presaleParams[9])

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted

            //check allocationSize AFTER buy
            const allocationSizeAfterBuy = await userConnectPresale.allocationSize()
            console.log("allocationSizeAfterBuy", ethers.formatEther(allocationSizeAfterBuy))

            expect(allocationSizeAfterBuy).to.equal(allocationSizeBeforeBuy - tokenAmount)

        })
        it("should track user USDC balance and contract balance correctly", async function(){
            const {pricePerTokenRoundTwo, pricePerTokenRoundThree, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

           //ROUND 1 BUY TO CRACK SOFTCAP
            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount
            const formatted3 = ethers.formatEther(presaleParams[3])
            const tokenAmount = ethers.parseEther(String(formatted3 * amount))

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted

            //check contract USDC Balance
            const contractUSDCBalance = await usdc.connect(user).balanceOf(presaleAddress)
            console.log("contract usdc balance after buy", ethers.formatUnits(contractUSDCBalance, 6))
            console.log("calculated usdc amount", ethers.formatUnits(usdcAmount, 6))

            expect(contractUSDCBalance).to.equal(usdcAmount)



        })
        it("should allow a user to withdraw USDC when presale is canceled", async function(){
            const {pricePerTokenRoundTwo, pricePerTokenRoundThree, maxWallet, userConnectStaking, stakingAddress, tokenIDs, usdc, presaleAddress, sexy, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken, gatingBalance, gatingContract} = context

           //ROUND 1 BUY TO CRACK SOFTCAP
            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount
            const formatted3 = ethers.formatEther(presaleParams[3])
            const tokenAmount = ethers.parseEther(String(formatted3 * amount))
            console.log("usdcAmount", ethers.formatUnits(usdcAmount, 6))

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted

            //check contract USDC Balance
            const contractUSDCBalance = await usdc.connect(user).balanceOf(presaleAddress)
            console.log("contract usdc balance after buy", ethers.formatUnits(contractUSDCBalance, 6))

            //cancel
            await sexyConnectPresale.cancelPresale()
            //user withdrawal
            const userUSDCBalanceBefore = await usdc.connect(user).balanceOf(userAddress)
            await expect(userConnectPresale.userUSDCWithdrawal()).to.not.be.reverted
            console.log("userUSDCBalanceBefore", ethers.formatUnits(userUSDCBalanceBefore, 6))

            const userUSDCBalanceAfter = await usdc.connect(user).balanceOf(userAddress)
            console.log("userUSDCBalanceAfter", ethers.formatUnits(userUSDCBalanceAfter,6))


            const contractUSDCBalanceAfter = await usdc.connect(user).balanceOf(presaleAddress)
            console.log("contract usdc balance after withdrawal", ethers.formatUnits(contractUSDCBalanceAfter, 6))

            const formattedUSDC= ethers.formatUnits(usdcAmount, 6)
            const formattedUserBefore = ethers.formatUnits(userUSDCBalanceBefore, 6)
            const formattedUserAfter =Number(ethers.formatUnits(userUSDCBalanceAfter, 6))
            const checksum = Number(formattedUserBefore) + Number(formattedUSDC)

            expect(contractUSDCBalanceAfter).to.equal(0)
            expect(formattedUserAfter).to.equal(checksum)


        })
        it("should allow an admin to withdraw the usdc after the presale is finished", async function(){
            const {presaleAddress, usdc, tokenIDs, sexy, sexyAddress, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            const roundOneStart = await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount

            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted
            
            //check balance of LNFT after buy
            const userBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            expect(userBalance).to.equal(amount);

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12] + 10)
            await sexyConnectPresale.finalisePresale()

            const sexyBalanceBefore = await usdc.connect(sexy).balanceOf(sexy.address)
            console.log("sexyBalanceBefore", sexyBalanceBefore)


            const usdcBefore = await usdc.connect(sexy).balanceOf(presaleAddress)
            //withdraw USDC
            await expect(sexyConnectPresale.withdrawUSDC(usdcAmount)).to.not.be.reverted

            const usdcAfter = await usdc.connect(sexy).balanceOf(presaleAddress)
            const sexyBalance = await usdc.connect(sexy).balanceOf(sexy.address)
            console.log("sexyBalance", sexyBalance)
            console.log("usdc before", usdcBefore)
            console.log("usdc after", usdcAfter)

            expect(usdcBefore - usdcAfter).to.equal(sexyBalance - sexyBalanceBefore)
           
        })
        it("should allow an admin to withdraw the remaining tokens after the presale is finished", async function(){
            const {presaleAddress,sexyConnectToken, usdc, tokenIDs, sexy, sexyAddress, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount
            const tokenAmount = amount * ethers.formatEther(presaleParams[3].toString())
            const parsedAmount = ethers.parseEther(tokenAmount.toString())
 
            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted
            
            //check balance of LNFT after buy
            const allocationSize = await sexyConnectPresale.allocationSize()
            console.log(allocationSize)

            //check if allocationSize is tracked correctly
            expect(presaleParams[9] - parsedAmount).to.equal(allocationSize)

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12] + 10)
            await sexyConnectPresale.finalisePresale()

            const sexyBalanceBefore = await userConnectToken.balanceOf(sexy.address)
            console.log("sexyBalanceBefore", sexyBalanceBefore)
            await expect(sexyConnectPresale.withdrawRemainingTokens(allocationSize)).to.not.be.reverted
            const sexyBalanceAfter = await userConnectToken.balanceOf(sexy.address)

            const allocationSizeAfter = await sexyConnectPresale.allocationSize()

            expect(allocationSizeAfter).to.equal(0)

            expect(sexyBalanceBefore + allocationSize).to.equal(sexyBalanceAfter)

           
        })
        it("should allow an admin to withdraw the full amount of tokens after the presale is canceled", async function(){
            const {presaleAddress,sexyConnectToken, usdc, tokenIDs, sexy, sexyAddress, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokenID = 1
            const amount = 30
            const usdcAmount = String(presaleParams[2]) * amount
 
            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokenIDs)).to.not.be.reverted
            
            //check balance of LNFT after buy
            const contractTokenBalance = await userConnectToken.balanceOf(presaleAddress)
            console.log("contractTokenbalance",contractTokenBalance)

            expect(contractTokenBalance).to.equal(presaleParams[9])

            //cancel Presale
            await sexyConnectPresale.cancelPresale()

            //check balances
            const sexyBalanceBefore = await userConnectToken.balanceOf(sexy.address)
            console.log("sexyBalanceBefore", sexyBalanceBefore)
            await expect(sexyConnectPresale.withdrawRemainingTokens(presaleParams[9])).to.not.be.reverted
            const sexyBalanceAfter = await userConnectToken.balanceOf(sexy.address)
            console.log("sexyBalanceAfter", sexyBalanceAfter)

            const contractBalanceAfter = await userConnectToken.balanceOf(presaleAddress)
            expect(contractBalanceAfter).to.equal(0)

            expect(sexyBalanceBefore + presaleParams[9]).to.equal(sexyBalanceAfter)

           
        })
        it("should cancel the presale when the hardcap is not hit", async function(){
            const {presaleAddress,sexyConnectToken, usdc, tokenIDs, sexy, sexyAddress, admin, user, eventhandler, presaleFactory, sexyConnectFactory, sexyConnectPresale, userConnectFactory, sexyConnectTokenFactory, tokenFactory, tokenFactoryAddress, presaleParams, gatingAddress, tokenAddress, userConnectPresale, userConnectNFT, userAddress, userConnectToken } = context

            //set block timestamp to round 1
            await time.increaseTo(presaleParams[0])

            //buy Params
            const tokens = ["1"]
            const tokenID = 1
            const amount = 1
            const usdcAmount = String(presaleParams[2]) * amount
 
            //approve usdc
            await expect(usdc.connect(user).approve(presaleAddress,usdcAmount)).to.not.be.reverted
            //buy round 1
            await expect(userConnectPresale.buyBatchLNFT(amount, tokens)).to.not.be.reverted
            
            const lNFTBalance = await userConnectPresale.balanceOf(userAddress, tokenID)
            console.log("LNFT balance", lNFTBalance)

            expect(lNFTBalance).to.equal(1)

            //fast forward to end of presale
            await time.increaseTo(presaleParams[12] + 10)
            await sexyConnectPresale.finalisePresale()

            const canceled = await userConnectPresale.canceled()
            console.log("canceled", canceled)
            expect(canceled).to.equal(true)

            expect(userConnectPresale.withdrawTokensRoundOne(amount)).to.be.reverted

           
        })
       /* it("should calculate the keccak256 of the events correctly", async function () {
            const factoryDeployed = "FactoryDeployed(address,uint256)";
            const factoryHash = ethers.keccak256(ethers.toUtf8Bytes(factoryDeployed));
            console.log("factory deployed hash", factoryHash);

            const lnftCreated = "LNFTCollectionCreated(address,address,string,address,uint256)";
            const lnftHash = ethers.keccak256(ethers.toUtf8Bytes(lnftCreated));
            console.log("lnft created hash", lnftHash);

            const presaleCreated = "PresaleCreated(address,address,uint256[],address,uint256)";
            const presaleCreatedHash = ethers.keccak256(ethers.toUtf8Bytes(presaleCreated));
            console.log("presale created hash", presaleCreatedHash);

            const lnftBought = "LNFTBought(address,address,uint256,uint256,uint256)";
            const lnftBoughtHash = ethers.keccak256(ethers.toUtf8Bytes(lnftBought));
            console.log("lnft bought hash", lnftBoughtHash);

            const tokensBought = "TokensBought(address,address,address,uint256,uint256,uint8,uint256)";
            const tokensBoughtHash = ethers.keccak256(ethers.toUtf8Bytes(tokensBought));
            console.log("tokens bought hash", tokensBoughtHash);

            const tokensWithdrawn = "TokensWithdrawn(address,address,address,uint256,uint256)";
            const tokensWithdrawnHash = ethers.keccak256(ethers.toUtf8Bytes(tokensWithdrawn));
            console.log("tokens withdrawn hash", tokensWithdrawnHash);

            const ethWithdrawn = "UserETHWithdrawal(address,address,uint256,uint256)";
            const ethWithdrawnHash = ethers.keccak256(ethers.toUtf8Bytes(ethWithdrawn));
            console.log("eth withdrawn hash", ethWithdrawnHash);

            const tokenDeployed = "TokenDeployed(address,string,string,address,uint256,uint256)";
            const tokenDeployedHash = ethers.keccak256(ethers.toUtf8Bytes(tokenDeployed));
            console.log("token deployed hash", tokenDeployedHash);

            const presaleMoved = "PresaleMoved(address,uint256,uint256)";
            const presaleMovedHash = ethers.keccak256(ethers.toUtf8Bytes(presaleMoved));
            console.log("presale moved hash", presaleMovedHash);

            const presaleCanceled = "PresaleCanceled(address,bool,uint256)";
            const presaleCanceledHash = ethers.keccak256(ethers.toUtf8Bytes(presaleCanceled));
            console.log("presale canceled hash", presaleCanceledHash);

            const tokensUnlocked = "TokensUnlocked(address,bool,uint256)";
            const tokensUnlockedHash = ethers.keccak256(ethers.toUtf8Bytes(tokensUnlocked));
            console.log("tokens unlocked hash", tokensUnlockedHash);

            const nftTransfer = "Transfer(address,address,uint256)";
            const nftTransferHash = ethers.keccak256(ethers.toUtf8Bytes(nftTransfer));
            console.log("nft transfer hash", nftTransferHash);
            
        })*/
    })

})