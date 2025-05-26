const {ethers, network} = require("hardhat");
const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");
const mongoose = require('mongoose');
require('dotenv').config()





//ipfs d3
//"https://gateway.pinata.cloud/ipfs/bafkreifjpmsuly7jwhxklsifspwgqrn54ojbipq3lsvsu5oyur5uhg67sy"

const main = {

    addresses:{
        bsc:{
            d3NFT: "0x967841Fadf1DcdC9DDd3b0BE2948a5eded9eDe17",
            eventhandler:"0x54E28Fc1365B865eBD2F8B343c8Eb36cF4295707",
            tokenFactory_old: "0x529D4069883AcdF4aD8352BCA0DeA3CF00757185",
            tokenFactory:"0xE82a368F1d7b66B3f484Fe75E520019473321Ba4",
            gatingToken:"0xB1518A279C27Df3f96ba4d8b90Ef0e7E5Cbf5a24",
            presaleFactory:"0xd56BB7624912c455656aE602E36f6Ca5e8B7F167",
            mock_usdc:"0x65795e821e0EeAaaDa4843c3C0b390b754AC9ff8",
            spadToken:"0x772AC8780eE9d7Fd85562F6766e34Cd246b743a0",
            d3Staking:"0x270415cF2486cDc1EB04E8A6D69Dd63A74939799"//xSPAD
        },
        base:{
            eventhandler:"",
            tokenFactory:"",
            
        }

    },

    deploy:
        async () => {
            try{
                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                const privateKey = process.env.PRIVATE_KEY_1
                const wallet = new ethers.Wallet(privateKey, ethers.provider)

                //deploy fake D3 NFT-Contract
                /*console.log("deploy D3-NFT Contract")
                const D3Factory = await ethers.getContractFactory("D3NFT", wallet)
                const d3Factory = await D3Factory.deploy("D","D")
                const d3Address = await d3Factory.getAddress()

                console.log("D3NFT contract address", d3Address)*/

                //deploy the eventhandler
                console.log("deploy Eventhandler Contract")

                const Eventhandler = await ethers.getContractFactory("Eventhandler", wallet);
                const eventhandler = await Eventhandler.deploy();
                await eventhandler.deploymentTransaction().wait()
                const eAddress= await eventhandler.getAddress();

                console.log("Eventhandler contract address", eAddress)
                await delay(2000); // wait 1 second

                //deploy the presale factory
                console.log("deploy Presale Factory")

                const d3NFT= "0x967841Fadf1DcdC9DDd3b0BE2948a5eded9eDe17"
                const usdc="0x65795e821e0EeAaaDa4843c3C0b390b754AC9ff8"

                const PresaleFactory = await ethers.getContractFactory("PresaleFactory", wallet);
                const presaleFactory = await PresaleFactory.deploy(eAddress, d3NFT, wallet.address, usdc, {gasLimit:5000000});
                await presaleFactory.deploymentTransaction().wait()
                const presaleFactoryAddress = await presaleFactory.getAddress();

                console.log("Presale Factory Address", presaleFactoryAddress)
                await delay(2000); // wait 1 second
                //set Presale Factory as valid caller and set presale factory active
                const walletConnectEventhandler = eventhandler.connect(wallet)
                const addCaller = await walletConnectEventhandler.setNewFactory(presaleFactoryAddress, true)
                await addCaller.wait()
                await delay(2000); // wait 1 second
                console.log("params on presale factory contract set")

                //deploy token factory
                console.log("deploy token factory")

                const TokenFactory = await ethers.getContractFactory("TokenFactory", wallet);
                const tokenFactory = await TokenFactory.deploy(eAddress,{gasLimit:5000000});
                await tokenFactory.deploymentTransaction().wait()
                const tokenFactoryAddress = await tokenFactory.getAddress();

                console.log("token factory address", tokenFactoryAddress)
                await delay(2000); // wait 1 second
                //set params for token factory
                const newFactory = await walletConnectEventhandler.setNewFactory(tokenFactoryAddress, true);
                await newFactory.wait()
                await delay(2000); // wait 1 second     
                console.log("params on eventhandler set")

                //deploy gating token
                console.log("deploy the gating token")

                const amount = ethers.parseEther("1000000")
                const walletConnectTokenFactory = tokenFactory.connect(wallet)
                const deployGatingToken = await walletConnectTokenFactory.deployERC20("GATE", "$GATE", amount,{gasLimit:5000000})
                const deployGatingTokenReceipt = await deployGatingToken.wait()

                const eventFilter = eventhandler.filters.TokenDeployed();
                const deployEvents = await eventhandler.queryFilter(eventFilter, deployGatingTokenReceipt.blockNumber, deployGatingTokenReceipt.blockNumber)

                let gatingAddress

                if (deployEvents.length > 0){
                    gatingAddress = deployEvents[0].args.token
                }

                console.log("gating token address", gatingAddress)


            }
            catch(e){console.log(e)}
        },
    mintERC20:
        async () => {
            console.log("deploy the gating token")
            try{
                const privateKey = process.env.PRIVATE_KEY_1
                console.log("private key", privateKey)
                const wallet = new ethers.Wallet(privateKey, ethers.provider)


                const TokenFactory = await ethers.getContractAt("TokenFactory", "0x529D4069883AcdF4aD8352BCA0DeA3CF00757185")
                const walletConnectTokenFactory = TokenFactory.connect(wallet)
                const eventhandler = await ethers.getContractAt("Eventhandler", "0xec5Eb1bA4E6fE9dF511d7634e6932690709912c1")

                const owner = await walletConnectTokenFactory.owner()
                console.log("owner", owner)

                
                const amount = ethers.parseEther("10000000")
                const deployGatingToken = await walletConnectTokenFactory.deployERC20("USDC", "$USDC", amount,{ gasLimit: 3000000 })
                const deployGatingTokenReceipt = await deployGatingToken.wait()

                const eventFilter = eventhandler.filters.TokenDeployed();
                const deployEvents = await eventhandler.queryFilter(eventFilter, deployGatingTokenReceipt.blockNumber, deployGatingTokenReceipt.blockNumber)

                let gatingAddress

                if (deployEvents.length > 0){
                    gatingAddress = deployEvents[0].args.token
                }

                console.log("gating token address", gatingAddress)
                

            }catch(e){console.log(e)}
            
        },
    getNFTs:
        async () =>{
            console.log("retrieving NFT balances")
            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)

            mongoose.connect(`${process.env.MONGO_URI}`) // for atlas cloud
            .then(() => console.log ("connected to mongoDB"))
            .catch(error => console.log("error connecting to mongoDB", error))

            const d3Nft = new mongoose.Schema({
                owner: String,
                tokenId: String,
            }, {collection: "d3Nfts", timestamps: true})
            const D3NFT = mongoose.model("D3NFT", d3Nft)

            const runApp = await Moralis.start({
                    apiKey: `${process.env.MORALIS_API}`
            })

            const address = "0x967841Fadf1DcdC9DDd3b0BE2948a5eded9eDe17";
            const chain = EvmChain.BSC_TESTNET;

            const response = await Moralis.EvmApi.nft.getNFTOwners({
                address,
                chain,
            });

            //console.log(response.toJSON());

            const data = response.toJSON();
            const nfts = data.result

            for(const item of nfts){
                await D3NFT.create({
                    owner: item.owner_of,
                    tokenId: item.token_id
                })
                console.log("item", item)
            }


        },
    deployPresaleFactory:
        async () =>{
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)

            const eAddress="0x54E28Fc1365B865eBD2F8B343c8Eb36cF4295707"
            const d3Address="0x967841Fadf1DcdC9DDd3b0BE2948a5eded9eDe17"
            const usdcAddress="0x65795e821e0EeAaaDa4843c3C0b390b754AC9ff8"

            const PresaleFactory = await ethers.getContractFactory("PresaleFactory", wallet);
            const presaleFactory = await PresaleFactory.deploy(eAddress, d3Address, wallet.address, usdcAddress);
            await presaleFactory.deploymentTransaction().wait()
            const presaleFactoryAddress = await presaleFactory.getAddress();
            console.log("Presale Factory Address", presaleFactoryAddress)
            await delay(3000);

            const eventhandler = await ethers.getContractAt("Eventhandler", eAddress)
            const walletConnectEventhandler = eventhandler.connect(wallet)
            const addCaller = await walletConnectEventhandler.setNewFactory(presaleFactoryAddress, true)

            console.log("addCaller", addCaller)

        },
    changeTokenFactoryOwner:
        async () => {
            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const TokenFactory = await ethers.getContractAt("TokenFactory", "0xac43d5B8115b9C98985F5ac7Fad93cfa27FE8563");
            const bigD="0xDDD03b35AFB5B27a2911f9004745A83A09C671A7"
            const tx = await TokenFactory.connect(wallet).transferOwnership(bigD)
            console.log("tx",tx)

        },
    changePresaleFactoryOwner:
        async () => {
            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const PresaleFactory = await ethers.getContractAt("PresaleFactory", "0xEAFec3D086f21FD12006Caf3B47bDffbB2895f8F");
            const bigD="0xDDD03b35AFB5B27a2911f9004745A83A09C671A7"
            const tx = await PresaleFactory.connect(wallet).changeOwner(bigD)
            console.log("tx",tx)

        },
    mintRandomToken:
        async () =>{
            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const amount = ethers.parseEther("500000000")

            const Token = await ethers.getContractFactory("CustomERC20",wallet)
            const token = await Token.deploy(wallet.address, amount, "Seedpad Token", "$SPAD")
            const tokenAddress = await token.getAddress()
            console.log("tokenAddress",tokenAddress)
        },
    setActive:
        async () => {
            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)

            const TokenFactory = await ethers.getContractAt("TokenFactory", "0xE82a368F1d7b66B3f484Fe75E520019473321Ba4");
            const walletConnectTokenFactory = TokenFactory.connect(wallet)
            const tx = await walletConnectTokenFactory.setActive(true)
            console.log("tx",tx)
            
        },
    getUSDCBalance:
        async () => {
            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const buyer = "0x062dc81A61b8C5fBA95c0c5d158fA6D41e0061Eb"

            const Presale = await ethers.getContractAt("Presale", "0xa199Ed08CeF86EE2e386Bc9EB1b7A8638F8bEb24");
            const connectPresale = Presale.connect(wallet)
            const balance = await connectPresale.usdcBalances(buyer)
            console.log("balance",balance)
            
        },
    deployStakingContract:
        async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)

            const D3Staking = await ethers.getContractFactory("D3Staking", wallet)
            const d3Staking = await D3Staking.deploy("xSPAD", "xSPAD", "0x772AC8780eE9d7Fd85562F6766e34Cd246b743a0")
            await d3Staking.deploymentTransaction().wait()
            const d3StakingAddress = await d3Staking.getAddress()
            console.log("d3StakingAddress",d3StakingAddress)
            await delay(4000)

            const token = await d3Staking.connect(wallet).getTokenAddress()
            console.log("token",token)
            
        },
    testStake:
        async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const d3StakingAddress = "0x1851a91097AA3219c506Bb8Fa462abb773bbADEc"

            const amount = ethers.parseEther("300000")
            const token = await ethers.getContractAt("CustomERC20", "0x772AC8780eE9d7Fd85562F6766e34Cd246b743a0")
            const walletConnectToken = token.connect(wallet)

            const tx1 = await walletConnectToken.approve(d3StakingAddress, amount)
            console.log("tx1",tx1)    
            await delay(4000)

            const allowanceOfToken = await walletConnectToken.allowance("0x062dc81A61b8C5fBA95c0c5d158fA6D41e0061Eb", "0x1851a91097AA3219c506Bb8Fa462abb773bbADEc")
            console.log("allowanceOfToken",allowanceOfToken)
            await delay(4000)
            const d3Staking = await ethers.getContractAt("D3Staking", "0x1851a91097AA3219c506Bb8Fa462abb773bbADEc")
            const walletConnectD3Staking = d3Staking.connect(wallet)


            const tx2 = await walletConnectD3Staking.mint(amount)
            console.log("tx2",tx2)
            await delay(4000)

            const balance = await walletConnectToken.balanceOf(wallet.address)
            console.log("balance",balance)
            await delay(4000)
            const balance2 = await walletConnectD3Staking.balanceOf(wallet.address)
            console.log("balance2",balance2)


        },
    testBurn:
        async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const amount = ethers.parseEther("100000")

            const token = await ethers.getContractAt("CustomERC20", "0x772AC8780eE9d7Fd85562F6766e34Cd246b743a0")
            const walletConnectToken = token.connect(wallet)
            const d3Staking = await ethers.getContractAt("D3Staking", "0x1851a91097AA3219c506Bb8Fa462abb773bbADEc")
            const walletConnectD3Staking = d3Staking.connect(wallet)
            
            const balanceOfToken = await walletConnectToken.balanceOf("0x1851a91097AA3219c506Bb8Fa462abb773bbADEc")
            console.log("balanceOfToken",ethers.formatEther(balanceOfToken))
            await delay(4000)

            const balanceOfUser = await walletConnectD3Staking.balanceOf(wallet.address)
            console.log("balanceOfUser",ethers.formatEther(balanceOfUser))
            await delay(4000)


            const tx1 = await walletConnectD3Staking.approve("0x772AC8780eE9d7Fd85562F6766e34Cd246b743a0", amount)
            console.log("tx1",tx1)    
            await delay(4000)
           

            const tx3 = await walletConnectD3Staking.burn(amount)
            console.log("tx3",tx3)
            await delay(4000)
            
        },
    getSPADAllowance:
        async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)
            const d3StakingAddress = "0x1851a91097AA3219c506Bb8Fa462abb773bbADEc"

            const amount = ethers.parseEther("300000")
            const token = await ethers.getContractAt("CustomERC20", "0x772AC8780eE9d7Fd85562F6766e34Cd246b743a0")
            const walletConnectToken = token.connect(wallet)

            /*const tx1 = await walletConnectToken.approve(d3StakingAddress, "0")
            await delay(4000)*/
/*
            const allowanceOfTokenBefore = await walletConnectToken.allowance("0x062dc81A61b8C5fBA95c0c5d158fA6D41e0061Eb", "0x1851a91097AA3219c506Bb8Fa462abb773bbADEc")
            console.log("allowanceOfTokenBefore",ethers.formatEther(allowanceOfTokenBefore))
            await delay(4000)

            const tx3 = await walletConnectToken.approve(d3StakingAddress, amount)
            console.log("tx3",tx3)    
            await delay(4000)*/

            const allowanceOfTokenAfter = await walletConnectToken.allowance("0x062dc81A61b8C5fBA95c0c5d158fA6D41e0061Eb", "0xBFD31526C6fbDEa2390D2dE6E3599C647df105D9")
            console.log("allowanceOfTokenAfter",ethers.formatEther(allowanceOfTokenAfter))
            await delay(4000)


        },
    deployTokenFactoryAndEventhandler:
        async () => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const privateKey = process.env.PRIVATE_KEY_1
            const wallet = new ethers.Wallet(privateKey, ethers.provider)

            const Eventhandler = await ethers.getContractFactory("Eventhandler", wallet);
            const eventhandler = await Eventhandler.deploy();
            await eventhandler.deploymentTransaction().wait()
            const eAddress= await eventhandler.getAddress();

            console.log("Eventhandler contract address", eAddress)
            await delay(2000); // wait 1 second

            const TokenFactory = await ethers.getContractFactory("TokenFactory", wallet);
            const tokenFactory = await TokenFactory.deploy(eAddress,{gasLimit:2000000});
            await tokenFactory.deploymentTransaction().wait()
            const tokenFactoryAddress = await tokenFactory.getAddress();

            console.log("token factory address", tokenFactoryAddress)
            await delay(2000); // wait 1 second

            const newFactory = await eventhandler.connect(wallet).setNewFactory(tokenFactoryAddress, true);
            await newFactory.wait()

            await delay(2000); // wait 1 second

            const setActive = await tokenFactory.connect(wallet).setActive(true)
            await setActive.wait()

            console.log("token factory active")


            
            
        }


}

//main.deploy();
//main.mintERC20();
//main.setActive();
//main.getNFTs()
//main.deployPresaleFactory()
main.changeTokenFactoryOwner()
//main.changePresaleFactoryOwner()
//main.mintRandomToken()
//main.setActive()
//main.getUSDCBalance()
//main.deployStakingContract()
//main.testStake()
//main.testBurn()
//main.getSPADAllowance()
//main.deployTokenFactoryAndEventhandler()