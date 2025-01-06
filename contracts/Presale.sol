// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

//TO DOs
// - check conditions for loops (i= 0 / 1)
// - allocation size overflow check: check required to make sure there are not more tokens sold to presale-participants than are available.

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Utils.sol";



contract Presale is ERC1155,  ReentrancyGuard {


    mapping(address => bool) private admins;
    mapping(uint => bool) public alreadyBought; //storing which of the holders of the d3 nft have bought.
    mapping(address => uint) public balances; //storing the withdrawable presale token balance of the user.
    mapping(address => uint) public ETHBalances; //storing the amount of ETH deposited by users.
   
    address private presaleMaster;

    address tokenAddress;
    uint allocationSize;
   
    uint currentNFTSupply;
    uint8 tokenId = 1;

    bool pause; //pause presale in case of emergency
    bool unlocked; //if true, tokens are withdrawable by buyers
    bool canceled; //if true, users can withdraw their deposited ETH
    bool presaleCreated; //if true, 

    //address d3Proxy = 0x09e8c457AEDB06C2830c4Be9805d1B20675EdeD8;
    IERC721 d3NFT = IERC721(0x09e8c457AEDB06C2830c4Be9805d1B20675EdeD8);

    struct Round1Params{
        uint start;
        uint end;
        uint pricePerLNFT;
        uint tokensPerLNFT;
        uint maxNFTSupply;
    }

    struct Round2Params{
        uint start;
        uint end;
        uint pricePerToken;
        uint maxWallet;
        address gatingToken;
        uint gatingBalance;
    }

    struct Round3Params{
        uint start;
        uint end;
        uint pricePerToken;
        uint maxWallet;
    }

    Round1Params params1;
    Round2Params params2;
    Round3Params params3;

    error PresaleNotLive();
    error NotAuthorized();
    error AlreadyBought();
    error InsufficientFunds();
    error NotEnoughAllocation();
    error Locked();
    error MaxWallet();
    error ZeroValue();
    error InvalidParam();





    modifier round1live(){
        if(block.timestamp <= params1.start || block.timestamp >= params1.end){
            revert PresaleNotLive();
        }
        _;
    }

    modifier round2live(){
        if(block.timestamp <= params2.start || block.timestamp >= params2.end){
            revert PresaleNotLive();
        }
        _;
    }

     modifier round3live(){
        if(block.timestamp <= params3.start || block.timestamp >= params3.end){
            revert PresaleNotLive();
        }
        _;
    }

    constructor (address _presaleMaster, address _tokenAddress, string memory _uri) ERC1155(_uri){
        presaleMaster = _presaleMaster;
        tokenAddress = _tokenAddress;

        admins[_presaleMaster] = true;
        
    }

    modifier onlyAdmin(){
        if(!admins[msg.sender]){revert NotAuthorized();}
        _;
    }

    modifier onlyOwner(){
        if(msg.sender != presaleMaster){revert NotAuthorized();}
        _;
    }


    //PRESALE ROUND 1 FUNCTIONS
    function buySingleLNFT(uint d3ID) public round1live nonReentrant payable{
        if(!presaleCreated){revert PresaleNotLive();}
        if(pause){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(alreadyBought[d3ID]){revert AlreadyBought();}
        address nftOwner = d3NFT.ownerOf(d3ID);
        if(nftOwner != _msgSender()){revert NotAuthorized();}
        if(params1.pricePerLNFT > msg.value){revert InsufficientFunds();}
        
        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;
        alreadyBought[d3ID] = true;
        _mint(_msgSender(), tokenId, 1, "");

        allocationSize -= params1.tokensPerLNFT;

        ++currentNFTSupply;
        if(currentNFTSupply > params1.maxNFTSupply){revert NotEnoughAllocation();}
    }


    function buyBatchLNFT(uint amount, uint [] memory d3IDs) public round1live nonReentrant payable{
        if(!presaleCreated){revert PresaleNotLive();}
        if(pause){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(amount > d3IDs.length){revert InsufficientFunds();}
        batchOwnershipCheck(d3IDs);
        batchAllocation(d3IDs);
        uint totalCost = amount * params1.pricePerLNFT;
        if(totalCost > msg.value){revert InsufficientFunds();}

        (uint [] memory tokenIds, uint [] memory amounts) = asSingletonArrays(tokenId, amount);

        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;
        _mintBatch(_msgSender(), tokenIds, amounts, "");

        allocationSize -= params1.tokensPerLNFT * amount;

        currentNFTSupply + amount;
        if(currentNFTSupply > params1.maxNFTSupply){revert NotEnoughAllocation();}
    }

    function withdrawTokensRoundOne(uint amountLNFT) public nonReentrant {
        if(!unlocked){revert Locked();}
        uint balanceLNFT = balanceOf(_msgSender(), tokenId);
        if(amountLNFT > balanceLNFT){revert InsufficientFunds();}

        (uint [] memory tokenIds, uint [] memory amounts) = asSingletonArrays(tokenId, amountLNFT);
        _burnBatch(_msgSender(), tokenIds, amounts);
        uint amountERC20 = balanceLNFT * params1.tokensPerLNFT;
        IERC20(tokenAddress).transfer(_msgSender(), amountERC20);
    }

    //PRESALE ROUND 2 FUNCTIONS 
    function buyTokensRoundTwo(uint amount) public round2live payable{
        if(!presaleCreated){revert PresaleNotLive();}
        if(pause){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(amount > params2.maxWallet){revert MaxWallet();}
        if(balances[_msgSender()] + amount > params2.maxWallet){revert MaxWallet();}
        if(amount > allocationSize){revert NotEnoughAllocation();}
        uint balance = IERC20(params2.gatingToken).balanceOf(_msgSender());
        if(balance < params2.gatingBalance){revert InsufficientFunds();}
        
        
        uint totalCost = amount * params2.pricePerToken;
        if(totalCost > msg.value){revert InsufficientFunds();}

        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;

        allocationSize -= amount;
        balances[_msgSender()] += amount;
    }


    //PRESALE ROUND 3 FUNCTIONS
    function buyTokensRoundThree(uint amount) external round3live payable {
        if(!presaleCreated){revert PresaleNotLive();}
        if(pause){revert PresaleNotLive();}
        if(canceled){revert PresaleNotLive();}
        if(amount > params3.maxWallet){revert MaxWallet();}
        if(balances[_msgSender()] + amount > params3.maxWallet){revert MaxWallet();}
        if(amount > allocationSize){revert NotEnoughAllocation();}

        uint totalCost = amount * params3.pricePerToken;
        if(totalCost > msg.value){revert InsufficientFunds();}

        (bool success, ) = payable(address(this)).call{value: msg.value}("");
        require(success,"ETH transfer failed");
        ETHBalances[_msgSender()] = msg.value;

        allocationSize -= amount;
        balances[_msgSender()] += amount;
    }


    function withdrawTokensRoundTwoAndThree(uint amount) external {
        if(!unlocked){revert Locked();}
        if(amount == 0){revert ZeroValue();}
        if(balances[_msgSender()] < amount){revert InsufficientFunds();}

        balances[_msgSender()] -= amount;
        IERC20(tokenAddress).transfer(_msgSender(), amount);

    }

    //HELPER FUNCTIONS
    function batchOwnershipCheck(uint [] memory d3IDs) internal view{
        for(uint i = 0; i < d3IDs.length; i++){
            uint id = d3IDs[i];
            address holder = d3NFT.ownerOf(id);
            if(_msgSender() != holder){revert InsufficientFunds();}
        }
    }

    function batchAllocation(uint [] memory d3IDs) internal {
        for(uint i = 0; i < d3IDs.length; i++){
            uint id = d3IDs[i];
            if(alreadyBought[id]){
                revert AlreadyBought();
            }
            else{
                alreadyBought[id] = true;
            }
        }
    }

    //WITHDRAW ETH AFTER CANCELED PRESALE
    function userETHWithdrawal() external {
        if(canceled){
            uint userETHBalance = ETHBalances[_msgSender()];
            ETHBalances[_msgSender()] -= userETHBalance;
            (bool success, ) = payable(_msgSender()).call{value: userETHBalance}("");
            require(success, "ETH transfer failed");
        }
    }


    //OWNER FUNCTIONS
    function setAdmin(address admin, bool newStatus) external onlyOwner{
        admins[admin] = newStatus;
    }

    function withdrawETH(uint256 amountETH) external onlyOwner{
        if(address(this).balance < amountETH){revert InsufficientFunds();}

        (bool success, ) = payable(_msgSender()).call{value: amountETH}("");
        require(success, "withdrawal failed");
    }



    //ADMIN FUNCTIONS

    /*
        function setRound1(uint _start, uint _end, uint _pricePerLNFT, uint _tokensPerLNFT) external onlyAdmin {
            if(_start >= block.timestamp){revert("Round 1 cannot start in the past");}
            params1.start=_start;
            params1.end=_end;
            params1.pricePerLNFT=_pricePerLNFT;
            params1.tokensPerLNFT=_tokensPerLNFT;
        }

        function setRound2(uint _start, uint _end, uint _pricePerToken, uint _maxWallet) external onlyAdmin {
            if(params1.start == 0){revert("you have to set Round 1 first");}
            if(_start <= params1.end){revert("round 1 has to end before round 2 can start");}
            params2.start=_start;
            params2.end=_end;
            params2.pricePerToken=_pricePertoken;
            params2.maxWallet=_maxWallet;
        }
    */

    /*
        @dev params []:
        0: start round 1
        1: end round 1
        2: price Per LNFT
        3: tokens Per LNFT
        4: start round 2
        5: end round 2
        6: price Per Token round 2
        7: max Wallet
        8: gating balance required
        9: allocationSize
        10: maxNFTSupply
        11: start round 3
        12: end round 3
        13: price Per Token round 3
        14: max Wallet round 3
    
    */

    function createPresale(uint [] memory params, address _gatingToken) external onlyAdmin {
        if(params[0] <= block.timestamp){revert InvalidParam();}
        if(params[1] <= block.timestamp || params[1] <= params[0]){revert InvalidParam();}
        if(params[1] >= params[4]){revert InvalidParam();}
        if(params[4] >= params[5]){revert InvalidParam();}
        if(params[5] >= params[11]){revert InvalidParam();}
        if(params[11] >= params[12]){revert InvalidParam();}
        if(params[2] == 0 || params[3] == 0 || params[6] == 0 || params[7] == 0 || params[8] == 0 || params[9] == 0 || params[10] == 0 || params[11] == 0 || params[12] == 0 || params[13] == 0 || params[14] == 0){revert ZeroValue();}

        params1.start = params[0];
        params1.end = params[1];
        params1.pricePerLNFT = params[2];
        params1.tokensPerLNFT = params[3];
        params1.maxNFTSupply = params[10];

        params2.start = params[4];
        params2.end = params[5];
        params2.pricePerToken = params[6];
        params2.maxWallet = params[7];
        params2.gatingBalance = params[8];
        params2.gatingToken = _gatingToken;

        params3.start = params[11];
        params3.end = params[12];
        params3.pricePerToken = params[13];
        params3.maxWallet = params[14];

        allocationSize = params[9];

        IERC20(tokenAddress).transfer(address(this), params[9]);
        presaleCreated = true;

    }

    function pausePresale(bool _pause) external onlyAdmin{
        pause = _pause;
    }

    function releaseTokens(bool _unlocked) external onlyAdmin{
        unlocked = _unlocked;
    }

    function cancelPresale(bool _canceled) external onlyAdmin{
        canceled = _canceled;
    }

    function setTokenAddress(address _tokenAddress) external onlyAdmin{
        if(_tokenAddress == address(0)){revert ZeroValue();}
        tokenAddress = _tokenAddress;
    }

    function setAllocationSize(uint256 _allocationSize) external onlyAdmin{
        if(_allocationSize == 0){revert ZeroValue();}
        allocationSize = _allocationSize;
    }


    function asSingletonArrays(
        uint256 element1,
        uint256 element2
    ) private pure returns (uint256[] memory array1, uint256[] memory array2) {
        assembly ("memory-safe") {
            // Load the free memory pointer
            array1 := mload(0x40)
            // Set array length to 1
            mstore(array1, 1)
            // Store the single element at the next word after the length (where content starts)
            mstore(add(array1, 0x20), element1)

            // Repeat for next array locating it right after the first array
            array2 := add(array1, 0x40)
            mstore(array2, 1)
            mstore(add(array2, 0x20), element2)

            // Update the free memory pointer by pointing after the second array
            mstore(0x40, add(array2, 0x40))
        }
    }

    fallback()external payable{}
    receive()external payable{}
    


}
