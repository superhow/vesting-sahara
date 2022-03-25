// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
* @title Sahara Vesting Smart Contract
* @author SUPER HOW?
* @notice Vesting initializable contract for beneficiary management and unlocked token claiming.
*/
contract Vesting is Initializable {
    IERC20 private token;
    address private contractOwner;

    uint private poolCount;
    uint private listingDate;

    event Claim(address indexed _from, uint _poolIndex, uint _tokenAmount);

    enum UnlockTypes{
        DAILY, 
        MONTHLY
    }

    struct Beneficiary {
        bool isWhitelisted;
        uint totalTokens;

        uint listingTokenAmount;
        uint cliffTokenAmount;
        uint vestedTokenAmount;

        uint claimedTotalTokenAmount;
    }

    struct Pool {
        string name;

        uint listingPercentageDividend;
        uint listingPercentageDivisor;

        uint cliffInDays;
        uint cliffEndDate;
        uint cliffPercentageDividend;
        uint cliffPercentageDivisor;

        uint vestingDurationInMonths;
        uint vestingDurationInDays;
        uint vestingEndDate;

        mapping(address => Beneficiary) beneficiaries;

        UnlockTypes unlockType;
        uint totalPoolTokenAmount;
        uint lockedPoolTokens;
    }

    mapping(uint => Pool) private vestingPools;
    mapping(address => uint) private userReentrancy;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(IERC20 _token, uint _listingDate) 
        public
        initializer
        validListingDate(_listingDate)
    {
        contractOwner = msg.sender;
        token = _token;
        poolCount = 0;
        listingDate = _listingDate;

        /* name, listing percentage, cliff period, cliff percentage, vesting months, unlock type, total token amount */
        addVestingPool('Angel Round', 0, 1, 90, 1, 20, 36, UnlockTypes.DAILY, 13000000 * 10 ** 18);
        addVestingPool('Seed',  0, 1, 90, 1, 20, 24, UnlockTypes.DAILY, 32500000 * 10 ** 18);
        addVestingPool('Private A',  0, 1, 90, 1, 20, 22, UnlockTypes.DAILY, 26000000 * 10 ** 18);
        addVestingPool('Private B', 0, 1, 60, 1, 20, 20, UnlockTypes.DAILY, 19500000 * 10 ** 18);
        addVestingPool('Marketing Round', 1, 20, 0, 0, 1, 20, UnlockTypes.DAILY, 19500000 * 10 ** 18);
        addVestingPool('Community', 0, 1, 360, 0, 1, 48, UnlockTypes.DAILY, 104000000 * 10 ** 18);
        addVestingPool('Team', 0, 1, 360, 0, 1, 48, UnlockTypes.DAILY, 110000000 * 10 ** 18);
        addVestingPool('Advisors',  0, 1, 180, 0, 1, 18, UnlockTypes.DAILY, 39500000 * 10 ** 18);
        addVestingPool('Staking/Yield farming', 0, 1, 0, 0, 1, 120, UnlockTypes.DAILY, 227500000 * 10 ** 18);
        
    }

    /**
    * @notice Checks whether the address is not zero.
    */
    modifier addressNotZero(address _address) {
        require(
            _address != address(0),
            "Wallet address can not be zero."
        );
        _;
    }

    /**
    * @notice Checks whether the listing date is not in the past.
    */
    modifier validListingDate(uint _listingDate) {
        require(
            _listingDate >= block.timestamp,
            "Listing date can be only set in the future."
        );
        _;
    }

    /**
    * @notice Checks whether the address has owner rights.
    */
    modifier onlyOwner() {
        require(
            contractOwner == msg.sender, 
            "Ownable: caller is not the owner");
        _;
    }

    /**
    * @notice Checks whether the editable vesting pool exists.
    */
    modifier poolExists(uint _poolIndex) {
        require(
           vestingPools[_poolIndex].cliffPercentageDivisor > 0,
            "Pool does not exist."
        );
        _;
    }

    /**
    * @notice Checks whether new pool's name does not already exist.
    */
    modifier nameDoesNotExist(string memory _name) {
        bool exists = false;
        for(uint i = 0; i < poolCount; i++){
            if(keccak256(abi.encodePacked(vestingPools[i].name)) == keccak256(abi.encodePacked(_name))){
                exists = true;
                break;
            }
        }
        require( 
            !exists, 
            "Vesting pool with such name already exists.");
        _;
    }
    
    /**
    * @notice Checks whether token amount > 0.
    */
    modifier tokenNotZero(uint _tokenAmount) {
        require(
            _tokenAmount > 0,
            "Token amount can not be 0."
        );
        _;
    }

    /**
    * @notice Checks whether the address is beneficiary of the pool.
    */
    modifier onlyWhitelisted(uint _poolIndex) {
        require(
            vestingPools[_poolIndex].beneficiaries[msg.sender].isWhitelisted,
            "Address is not in the whitelist."
        );
        _;
    }

    /**
    * @notice Transfer ownership of the contract with all privileges to new owner.
    */
    function transferOwnership(address newOwner)
        external
        onlyOwner
    {
        contractOwner = newOwner;
    }

    /**
    * @notice Adds new vesting pool and pushes new id to ID array.
    * @param _name Vesting pool name.
    * @param _listingPercentageDividend Percentage fractional form dividend part.
    * @param _listingPercentageDivisor Percentage fractional form divisor part.
    * @param _cliffInDays Period of the first lock (cliff) in days.
    * @param _cliffPercentageDividend Percentage fractional form dividend part.
    * @param _cliffPercentageDivisor Percentage fractional form divisor part.
    * @param _vestingDurationInMonths Duration of the vesting period.
    */
    function addVestingPool (
        string memory _name,
        uint _listingPercentageDividend,
        uint _listingPercentageDivisor,
        uint _cliffInDays,
        uint _cliffPercentageDividend,
        uint _cliffPercentageDivisor,
        uint _vestingDurationInMonths,
        UnlockTypes _unlockType,
        uint _totalPoolTokenAmount)
        public
        onlyOwner
        nameDoesNotExist(_name)
        tokenNotZero(_totalPoolTokenAmount)
    {
        require(
           (_listingPercentageDivisor > 0 && _cliffPercentageDivisor > 0),
            "Percentage divisor can not be zero."
            );
  
        require( 
            (_listingPercentageDividend * _cliffPercentageDivisor) + 
            (_cliffPercentageDividend * _listingPercentageDivisor) <=
            (_listingPercentageDivisor * _cliffPercentageDivisor),
            "Listing and cliff percentage can not exceed 100."
            );

        Pool storage p = vestingPools[poolCount];

        p.name = _name;
        p.listingPercentageDividend = _listingPercentageDividend;
        p.listingPercentageDivisor = _listingPercentageDivisor;

        p.cliffInDays = _cliffInDays;
        p.cliffEndDate = listingDate + (_cliffInDays * 1 days);

        p.cliffPercentageDividend = _cliffPercentageDividend;
        p.cliffPercentageDivisor = _cliffPercentageDivisor;

        p.vestingDurationInDays = _vestingDurationInMonths * 30;
        p.vestingDurationInMonths = _vestingDurationInMonths;
        p.vestingEndDate  = p.cliffEndDate + (p.vestingDurationInDays * 1 days);

        p.unlockType = _unlockType;
        p.totalPoolTokenAmount = _totalPoolTokenAmount;

        poolCount++;
    }

    /**
    * @notice Adds address with purchased token amount to vesting pool.
    * @param _poolIndex Index that refers to vesting pool object.
    * @param _address Address of the beneficiary wallet.
    * @param _tokenAmount Purchased token absolute amount (with included decimals).
    */
    function addToBeneficiariesList(
        uint _poolIndex,
        address _address,
        uint _tokenAmount)
        public
        onlyOwner
        addressNotZero(_address)
        poolExists(_poolIndex)
        tokenNotZero(_tokenAmount)
    {
        Pool storage p = vestingPools[_poolIndex];

        require(
            p.totalPoolTokenAmount >= (p.lockedPoolTokens + _tokenAmount),
            "Allocated token amount will exceed total pool amount."
        );

        p.lockedPoolTokens += _tokenAmount;
        Beneficiary storage b = p.beneficiaries[_address];
        b.isWhitelisted = true;
        b.totalTokens += _tokenAmount;
        b.listingTokenAmount = getTokensByPercentage(b.totalTokens,
                                                    p.listingPercentageDividend,
                                                    p.listingPercentageDivisor);

        b.cliffTokenAmount = getTokensByPercentage(b.totalTokens,
                                                    p.cliffPercentageDividend, 
                                                    p.cliffPercentageDivisor);
        b.vestedTokenAmount = b.totalTokens - b.listingTokenAmount - b.cliffTokenAmount;
    }

    /**
    * @notice Adds addresses with purchased token amount to the beneficiary list.
    * @param _poolIndex Index that refers to vesting pool object.
    * @param _addresses List of whitelisted addresses.
    * @param _tokenAmount Purchased token absolute amount (with included decimals).
    * @dev Example of parameters: ["address1","address2"], ["address1Amount", "address2Amount"].
    */
    function addToBeneficiariesListMultiple(
        uint _poolIndex,
        address[] calldata _addresses,
        uint[] calldata _tokenAmount)
        external
        onlyOwner
    {
        require(
            _addresses.length == _tokenAmount.length, 
            "Addresses and token amount arrays must be the same size."
            );

        for (uint i = 0; i < _addresses.length; i++) {
           addToBeneficiariesList(_poolIndex, _addresses[i], _tokenAmount[i]);
        }
    }

    /**
    * @notice Removes beneficiary from the structure.
    * @param _poolIndex Index that refers to vesting pool object.
    * @param _address Address of the beneficiary wallet.
    */
    function removeBeneficiary(uint _poolIndex, address _address)
        external
        onlyOwner
        poolExists(_poolIndex)
    {
        Pool storage p = vestingPools[_poolIndex];
        Beneficiary storage b = p.beneficiaries[_address];
        p.lockedPoolTokens -= (b.totalTokens - b.claimedTotalTokenAmount);
        delete p.beneficiaries[_address];
    }

    /**
    * @notice Sets new listing date and recalculates cliff and vesting end dates for all pools.
    * @param _listingDate new listing date.
    */
    function changeListingDate(uint _listingDate)
        external
        onlyOwner
        validListingDate(_listingDate)
    {
        listingDate = _listingDate;
        for(uint i; i < poolCount; i++){
            Pool storage p = vestingPools[i];
            p.cliffEndDate = _listingDate + (p.cliffInDays * 1 days);
            p.vestingEndDate = p.cliffEndDate + (p.vestingDurationInDays * 1 days);
        }
    }

    /**
    * @notice Function lets caller claim unlocked tokens from specified vesting pool.
    * @param _poolIndex Index that refers to vesting pool object.
    * if the vesting period has ended - beneficiary is transferred all unclaimed tokens.
    */
    function claimTokens(uint _poolIndex)
        external
        poolExists(_poolIndex)
        addressNotZero(msg.sender)
        onlyWhitelisted(_poolIndex)
    {
        uint unlockedTokens = unlockedTokenAmount(_poolIndex, msg.sender);
        require(
            unlockedTokens > 0, 
            "There are no claimable tokens."
        );
        require(
            unlockedTokens <= token.balanceOf(address(this)),
            "There are not enough tokens in the contract."
        );
        vestingPools[_poolIndex].beneficiaries[msg.sender].claimedTotalTokenAmount += unlockedTokens;
        token.approve(address(this), unlockedTokens);
        token.transferFrom(address(this), msg.sender, unlockedTokens);

        emit Claim(msg.sender, _poolIndex, unlockedTokens);
    }

    /**
    * @notice Calculates unlocked and unclaimed tokens based on the days passed.
    * @param _address Address of the beneficiary wallet.
    * @param _poolIndex Index that refers to vesting pool object.
    * @return uint total unlocked and unclaimed tokens.
    */
    function unlockedTokenAmount(uint _poolIndex, address _address)
        public
        view
        returns (uint)
    {
        Pool storage p = vestingPools[_poolIndex];
        Beneficiary storage b = p.beneficiaries[_address];
        uint unlockedTokens = 0;

        if (block.timestamp < listingDate) { // Listing has not begun yet. Return 0.
            return unlockedTokens;
        } else if (block.timestamp < p.cliffEndDate) { // Cliff period has not ended yet. Unlocked listing tokens.
            unlockedTokens = b.listingTokenAmount;
        } else if (block.timestamp >= p.vestingEndDate) { // Vesting period has ended. Unlocked all tokens.
            unlockedTokens = b.totalTokens;
        } else { // Cliff period has ended. Calculate vested tokens.
            (uint duration, uint periodsPassed) = vestingPeriodsPassed(_poolIndex);
            unlockedTokens = b.listingTokenAmount + b.cliffTokenAmount + 
                            (b.vestedTokenAmount * periodsPassed / duration);
        }
        return unlockedTokens - b.claimedTotalTokenAmount;
    }

    /**
    * @notice Calculates how many full days or months have passed since the cliff end.
    * @param _poolIndex Index that refers to vesting pool object.   
    * @return If unlock type is daily: vesting duration in days, else: in months.
    * @return If unlock type is daily: number of days passed, else: number of months passed.
    */
    function vestingPeriodsPassed(uint _poolIndex)
        public
        view
        returns (uint, uint)
    {
        Pool storage p = vestingPools[_poolIndex];
        // Cliff not ended yet
        if(block.timestamp < p.cliffEndDate){
            return (p.vestingDurationInMonths, 0);
        }
        // Unlock type daily
        else if (p.unlockType == UnlockTypes.DAILY) { 
            return (p.vestingDurationInDays, (block.timestamp - p.cliffEndDate) / 1 days);
        // Unlock type monthly
        } else {
            return (p.vestingDurationInMonths, (block.timestamp - p.cliffEndDate) / 30 days);
        }
    }
    
    /**
    * @notice Calculate token amount based on the provided prcentage.
    * @param totalAmount Token amount which will be used for percentage calculation.
    * @param dividend The number from which total amount will be multiplied.
    * @param divisor The number from which total amount will be divided.
    */
    function getTokensByPercentage(uint totalAmount, uint dividend, uint divisor) 
        internal
        pure
        returns (uint)
    {
        return totalAmount * dividend / divisor;
    }

    /**
    * @notice Checks how many tokens unlocked in a pool (not allocated to any user).
    * @param _poolIndex Index that refers to vesting pool object.
    */
    function totalUnclaimedPoolTokens(uint _poolIndex) 
        external
        view
        returns (uint)
    {
        Pool storage p = vestingPools[_poolIndex];
        return p.totalPoolTokenAmount - p.lockedPoolTokens;
    }

    /**
    * @notice View of the beneficiary structure.
    * @param _poolIndex Index that refers to vesting pool object.
    * @param _address Address of the beneficiary wallet.
    * @return Beneficiary structure information.
    */
    function beneficiaryInformation(uint _poolIndex, address _address)
        external
        view
        returns (
            bool, 
            uint, 
            uint, 
            uint,
            uint, 
            uint
        )
    {
        Beneficiary storage b = vestingPools[_poolIndex].beneficiaries[_address];
        return (
            b.isWhitelisted,
            b.totalTokens,
            b.listingTokenAmount,
            b.cliffTokenAmount,
            b.vestedTokenAmount,
            b.claimedTotalTokenAmount
        );
    }

    /**
    * @notice Return global listing date value (in epoch timestamp format).
    * @return uint listing date.
    */ 
    function getListingDate() 
        external
        view
        returns (uint)
    {
        return listingDate;
    }

    /**
    * @notice Return number of pools in contract.
    * @return uint pool count.
    */ 
    function getPoolCount() 
        external
        view
        returns (uint)
    {
        return poolCount;
    }

    /**
    * @notice Return claimable token address
    * @return IERC20 token.
    */ 
    function getToken() 
        external
        view
        returns (IERC20)
    {
        return token;
    }

    /**
    * @notice View of the vesting pool structure.
    * @param _poolIndex Index that refers to vesting pool object.
    * @return Part of the vesting pool information.
    */
    function poolDates(uint _poolIndex)
        external
        view
        returns (
            uint, 
            uint, 
            uint, 
            uint,
            uint
        )
    {
        Pool storage p = vestingPools[_poolIndex];
        return (
            p.cliffInDays,
            p.cliffEndDate,
            p.vestingDurationInDays,
            p.vestingDurationInMonths,
            p.vestingEndDate
        );
    }

    /**
    * @notice View of the vesting pool structure.
    * @param _poolIndex Index that refers to vesting pool object.
    * @return Part of the vesting pool information.
    */
    function poolData(uint _poolIndex)
        external
        view
        returns (
            string memory,
            uint,
            uint, 
            uint,
            uint,
            UnlockTypes,
            uint
        )
    {
        Pool storage p = vestingPools[_poolIndex];
        return (
            p.name,
            p.listingPercentageDividend,
            p.listingPercentageDivisor,
            p.cliffPercentageDividend,
            p.cliffPercentageDivisor,
            p.unlockType,
            p.totalPoolTokenAmount
        );
    }
}