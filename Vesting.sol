// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Vesting is Initializable {
    IERC20 private token;
    address private contractOwner;

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private poolCount;
    uint256 private listingDate;

    event Claim(address indexed _from, uint _poolIndex, uint _tokenAmount);

    enum UnlockTypes{
        DAILY, 
        MONTHLY
    }

    struct Beneficiary {
        bool isWhitelisted;
        uint256 totalTokens;

        uint256 listingTokenAmount;
        uint256 cliffTokenAmount;
        uint256 vestedTokenAmount;

        uint256 claimedTotalTokenAmount;
    }

    struct Pool {
        string name;

        uint256 listingPercentageDividend;
        uint256 listingPercentageDivisor;

        uint256 cliffInDays;
        uint256 cliffEndDate;
        uint256 cliffPercentageDividend;
        uint256 cliffPercentageDivisor;

        uint256 vestingDurationInMonths;
        uint256 vestingDurationInDays;
        uint256 vestingEndDate;

        mapping(address => Beneficiary) beneficiaries;

        UnlockTypes unlockType;
        uint256 totalPoolTokenAmount;
        uint256 lockedPoolTokens;
    }

    mapping(uint256 => Pool) private vestingPools;
    mapping(address => uint256) private userReentrancy;

    function initialize(IERC20 _token, uint256 _listingDate) 
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
        addVestingPool('Seed', 0, 1, 90, 1, 20, 24, UnlockTypes.DAILY, 32500000 * 10 ** 18);
        addVestingPool('Private A', 0, 1, 90, 1, 20, 22, UnlockTypes.DAILY, 26000000 * 10 ** 18);
        addVestingPool('Private B', 0, 1, 60, 1, 20, 20, UnlockTypes.DAILY, 19500000 * 10 ** 18);
        addVestingPool('Marketing Round', 1, 20, 0, 0, 1, 20, UnlockTypes.DAILY, 19500000 * 10 ** 18);
        addVestingPool('Community', 0, 1, 360, 0, 1, 48, UnlockTypes.DAILY, 104000000 * 10 ** 18);
        addVestingPool('Team', 0, 1, 360, 0, 1, 48, UnlockTypes.DAILY, 110000000 * 10 ** 18);
        addVestingPool('Advisors', 0, 1, 180, 0, 1, 18, UnlockTypes.DAILY, 39500000 * 10 ** 18);
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
    modifier validListingDate(uint256 _listingDate) {
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
    modifier poolExists(uint256 _poolIndex) {
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
        for(uint256 i = 0; i < poolCount; i++){
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
    modifier tokenNotZero(uint256 _tokenAmount) {
        require(
            _tokenAmount > 0,
            "Token amount can not be 0."
        );
        _;
    }

    /**
    * @notice Checks whether the address is beneficiary of the pool.
    */
    modifier onlyWhitelisted(uint256 _poolIndex) {
        require(
            vestingPools[_poolIndex].beneficiaries[msg.sender].isWhitelisted,
            "Address is not in the whitelist."
        );
        _;
    }

    /**
    * @notice Reentrancy check.
    */
    modifier nonReentrant() {
        require(
            userReentrancy[msg.sender] != ENTERED,
            "ReentrancyGuard: reentrant call."
            );
        userReentrancy[msg.sender] = ENTERED;
        _;
        userReentrancy[msg.sender] = NOT_ENTERED;
    }

    /**
    * @notice Transfer ownership of the contract with all privileges to new owner.
    */
    function transferOwnership(address newOwner)
        public
        onlyOwner 
    {
        contractOwner = newOwner;
    }

    /**
    * @notice Reset reentrancy for the specific address in case the value is stuck but not valid.
    */
    function resetReentrancy(address _address)
        public
        onlyOwner
    {
        userReentrancy[_address] = NOT_ENTERED;
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
        uint256 _listingPercentageDividend,
        uint256 _listingPercentageDivisor,
        uint256 _cliffInDays,
        uint256 _cliffPercentageDividend,
        uint256 _cliffPercentageDivisor,
        uint256 _vestingDurationInMonths,
        UnlockTypes _unlockType,
        uint256 _totalPoolTokenAmount)
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
        uint256 _poolIndex,
        address _address,
        uint256 _tokenAmount)
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
        uint256 _poolIndex,
        address[] calldata _addresses,
        uint256[] calldata _tokenAmount)
        public
        onlyOwner
    {
        require(
            _addresses.length == _tokenAmount.length, 
            "Addresses and token amount arrays must be the same size."
            );

        for (uint256 i = 0; i < _addresses.length; i++) {
           addToBeneficiariesList(_poolIndex, _addresses[i], _tokenAmount[i]);
        }
    }

    /**
    * @notice Removes beneficiary from the structure.
    * @param _poolIndex Index that refers to vesting pool object.
    * @param _address Address of the beneficiary wallet.
    */
    function removeBeneficiary(uint256 _poolIndex, address _address)
        public
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
    function changeListingDate(uint256 _listingDate)
        public
        onlyOwner
        validListingDate(_listingDate)
    {
        listingDate = _listingDate;
        for(uint256 i; i < poolCount; i++){
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
    function claimTokens(uint256 _poolIndex)
        public
        poolExists(_poolIndex)
        addressNotZero(msg.sender)
        onlyWhitelisted(_poolIndex)
        nonReentrant
    {
        uint256 unlockedTokens = unlockedTokenAmount(_poolIndex, msg.sender);
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
    * @return uint256 total unlocked and unclaimed tokens.
    */
    function unlockedTokenAmount(uint256 _poolIndex, address _address)
        public
        view
        returns (uint256)
    {
        Pool storage p = vestingPools[_poolIndex];
        Beneficiary storage b = p.beneficiaries[_address];
        uint256 unlockedTokens = 0;

        if (block.timestamp < listingDate) { // Listing has not begun yet. Return 0.
            return unlockedTokens;
        } else if (block.timestamp < p.cliffEndDate) { // Cliff period has not ended yet. Unlocked listing tokens.
            unlockedTokens = b.listingTokenAmount;
        } else if (block.timestamp >= p.vestingEndDate) { // Vesting period has ended. Unlocked all tokens.
            unlockedTokens = b.totalTokens;
        } else { // Cliff period has ended. Calculate vested tokens.
            (uint256 duration, uint256 periodsPassed) = vestingPeriodsPassed(_poolIndex);
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
    function vestingPeriodsPassed(uint256 _poolIndex)
        public
        view
        returns (uint256, uint256)
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
    function getTokensByPercentage(uint256 totalAmount, uint256 dividend, uint256 divisor) 
        public
        pure
        returns (uint256)
    {
        return totalAmount * dividend / divisor;
    }

    /**
    * @notice Checks how many tokens unlocked in a pool (not allocated to any user).
    * @param _poolIndex Index that refers to vesting pool object.
    */
    function totalUnclaimedPoolTokens(uint256 _poolIndex) 
        public
        view
        returns (uint256)
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
    function beneficiaryInformation(uint256 _poolIndex, address _address)
        external
        view
        returns (
            bool, 
            uint256, 
            uint256, 
            uint256,
            uint256, 
            uint256
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
    * @return uint256 listing date.
    */ 
    function getListingDate() 
        public
        view
        returns (uint256)
    {
        return listingDate;
    }

    /**
    * @notice Return number of pools in contract.
    * @return uint256 pool count.
    */ 
    function getPoolCount() 
        public
        view
        returns (uint256)
    {
        return poolCount;
    }

    /**
    * @notice Return claimable token address
    * @return IERC20 token.
    */ 
    function getToken() 
        public
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
    function poolDates(uint256 _poolIndex)
        public
        view
        returns (
            uint256, 
            uint256, 
            uint256, 
            uint256,
            uint256
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
    function poolData(uint256 _poolIndex)
        public
        view
        returns (
            string memory,
            uint256,
            uint256, 
            uint256,
            uint256,
            UnlockTypes,
            uint256
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
