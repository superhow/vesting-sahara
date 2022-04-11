# Vesting for Sahara platform
![Vesting Schedule](Vesting-diagram.png?raw=true) <br />
This contract implements token vesting and claiming for the specified list of beneficiaries.
Vested tokens unlocked: **daily / monthly** after the cliff period ended.

The aim of this project is to distribute [ERC20 SAHARA Tokens](https://polygonscan.com/token/0x8dca2831255e34ca647dba0ed103b5921fa3e975) to the list of beneficiaries.
Contract can hold multiple pools, however - **the listing date for all pools is the same.**

# Sahara platform
Tokens will be available for claiming in the [Sahara plaftorm](https://sahara.network/). 
Sahara is dedicated privacy protocol ecosystem that allows on-platform trade between stable and volatile assets. 
In short, Sahara will allow users to enjoy the benefits of blockchain trade in true privacy. 
No more transferring funds onto separate chains with separate protocols.

## Vesting pools
Vesting pools can be added in the constructor or separately in addVestingPoolFunction.<br />
Data for pools:

| Vesting Pool          | Tokens      | %   Listing | Cliff release % | Cliff period (months) | Vesting                                              |
|-----------------------|-------------|-------------|-----------------|-----------------------|------------------------------------------------------|
| Angel Round           | 13,000,000  | 0 %         | 5 %           | 3                     | Linear (daily) over 36 months                        |
| Seed                  | 32,500,000  | 0 %         | 5 %           | 3                     | Linear (daily) over 24 months                        |
| Private A             | 26,000,000  | 0 %         | 5 %           | 3                     | Linear (daily) over 22 months                        |
| Private B             | 19,500,000  | 0 %         | 5 %           | 2                     | Linear (daily) over 20 months                        |
| Marketing round       | 19,500,000  | 5 %         | 0 %           | 0                     | Linear (daily) over 24 months                        |
| Community             | 104,000,000 | 0 %         | 0 %           | 12                    | Linear (daily) over 48 months                        |
| Team                  | 110,500,000 | 0 %         | 0 %           | 12                    | Linear (daily) over 48 months                        |
| Advisors              | 39,000,000  | 0 %         | 0 %           | 6                     | Linear (daily) over 18 months                        |
| Staking/Yield farming | 227,500,000 | 0 %         | 0 %           | 0                     | 10 years strategic release to support earning reward |

# Main vesting contract code
[Vesting.sol](contracts/Vesting.sol)

# Deployment
## Prerequisites:
- node  (version > 14)
- Ubuntu

Edit env file (**listing date** and **token addresses** (if not deployed in 'development' server):
- Listing date **must** be set in the future! Format - epoch timestamp.

```bash
# ****SCAN API KEYS FOR VERIFICATION
# Obtain key in polygonscan. One key works for test and main nets.
POLYGON_SCAN_API_KEY_VERIFICATION=

# Polygon Testnet (Mumbai) wallet private key and RPC URL
MUMBAI_PRIVATE_KEY=
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/v1/...
MUMBAI_ERC_20_TOKEN=
MUMBAI_VESTING_LISTING_DATE=1649589285

# Polygon (Matic) wallet private key and RPC URL
MATIC_PRIVATE_KEY=
MATIC_RPC_URL=https://rpc-mainnet.maticvigil.com/v1/...
MATIC_ERC_20_TOKEN=
MATIC_VESTING_LISTING_DATE=1649589285

```

### 1: Install dependencies
```bash
npm i
```
### 2. Test
Start local blockchain (development server)
```bash
npx ganache-cli
```
For deployment in development:
```bash
npm run test
```
or

```bash
rm-rf build
npx truffle test
```

### 3. Deploy implementation + proxy admin + proxy
- For deployment in development:
Start local blockchain (development server)
```bash
npx ganache-cli
```
then: 

```bash
npm run migrate:development
```

- If using truffle dashboard:
```bash
npx truffle dashboard
```
then:

```bash
npm run migrate:dashboard
```


# High level documentation
Below is Sahara Vesting contract high level documentation with actors, rules and main object parameters.
[Sahara High Level Documentation.pdf](https://github.com/superhow/vesting/blob/main/Sahara%20High%20Level%20Documentation.pdf)


## Roles
- **Contract owner** can add vesting pools with specified listing, cliff percentage and vesting duration.
-	**Contract owner** can add beneficiary wallets that are eligible for claiming tokens.
-	**Contract owner** can change listing date.
-	**Contract owner** can remove beneficiary.
-	**Beneficiary** can claim vested tokens if there are any.
-	**All users** can check vesting pool data.

## Pool Parameters
| Parameter                 | Type               | Explanation                                                                                                                                                                                                         |
|---------------------------|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name                      | string             | Pool name                                                                                                                                                                                                           |
| listingPercentageDividend | uint256            | Tokens unlocked on listing date. If listing percentage is 5%,  then dividend is: 1 and divisor is: 20 (1/20 = 0,05)                                                                                                 |
| listingPercentageDivisor  | uint256            |                                                                                                                                                                                                                     |
| cliff                     | uint256            | Cliff period in days.                                                                                                                                                                                               |
| cliffPercentageDividend   | uint256            | Tokens unlocked after cliff period has ended. If cliff percentage is 7,5%,  then dividend is: 3 and divisor is: 40 (3/40 = 0,075)                                                                                   |
| cliffPercentageDivisor    | uint256            |                                                                                                                                                                                                                     |
| vestingDurationInMonths   | uint256            | Duration of vesting period when tokens are linearly unlocked. (Refer to the graph in Vesting contract )                                                                                                             |
| unlockType                | UnlockTypes (enum) | 0 for DAILY; 1 for MONTHLY;                                                                                                                                                                                         |
| poolTokenAmount           | uint256            | Total amount of tokens available for claiming from pool. absolute token amount! If pool has 5 000 000 tokens, contract will accept “5000000000000000000000000” ← value as a paremeter which is ( 5 000 000 * 1018 ) |

## Beneficiary Parameters

| Parameter   | Type      | Explanation                                                                    |
|-------------|-----------|--------------------------------------------------------------------------------|
| poolIndex   | uint256   | Pool index                                                                     |
| addresses   | address[] | Beneficiary wallet addresses                                                   |
| tokenAmount | uint256[] | Amounts of tokens that can be claimed by beneficiaries. absolute token amount! |

Token amount for beneficiary is recalculated this way: **Total amount = Listing amount + Cliff amount + Vesting amount**

### Claiming tokens
Beneficiaries can claim tokens from the selected pools
- **If listing has started** : listing token amount;
- **If cliff has ended** : listing token amount + cliff token amount + vested unlocked tokens: 
 <img src="https://latex.codecogs.com/svg.image?unlockedTokens&space;=&space;listingAmount&space;&plus;&space;cliffAmount&space;&plus;&space;\frac{vestingAmount&space;*&space;periodsPassed}{duration}" /><br />
- **If vesting period ended** : transfer all allocated and unclaimed tokens.

## Deployment logic
•	We deploy a separate **Vesting.sol** and a TransparentUpgradeableProxy.sol contract (latter is OpenZeppelin standard and is uploaded using [truffle-upgrades plugin](https://www.npmjs.com/package/@openzeppelin/truffle-upgrades) (code is not stored in the repository as we use the standard library).

## Tests
Full log can be found in [testsLog.txt](test/testsLog.txt)
<details>
  <summary>Run tests log</summary>
  
  ```javascript
    Contract: VestingMock
    1. addVestingPool
      √ 1.1. Should be able to add a pool (4470ms)
      √ 1.2. Should not be able to add a pool from non-owner account (3957ms)
      √ 1.3. Should not be able to add a pool when _listingPercentageDivisor==0 (3952ms)
      √ 1.4. Should not be able to add a pool when _cliffPercentageDivisor==0 (3833ms)
      √ 1.5. Should not be able to add a pool when _cliffPercentageDivisor==0 and _listingPercentageDivisor==0 (3960ms)
      √ 1.6. Should not be able to add a pool when pool cliff Percentage + pool listing Percentage > 100 (4223ms)
    2. addToBeneficiariesList
      √ 2.1. Should be able to add a beneficiary to a pool (6379ms)
      √ 2.2. Should not be able to add a beneficiary from a non-owner account (5773ms)
      √ 2.3. Should not be able to add a beneficiary to a pool when _tokenAmount==0 (6016ms)
      √ 2.4. Should not be able to add a beneficiary to a non-existing pool (3591ms)
      √ 2.5. Should not be able to add a beneficiary to a pool when _tokenAmount exceeds pool.totalPoolTokenAmount-pool.lockedPoolTokens (5337ms)
      √ 2.6. Should be able to add a beneficiary to a pool twice (7828ms)
    3. addToBeneficiariesListMultiple
      √ 3.1. Should not be able to add beneficiaries to a pool from a non-owner account (6018ms)
      √ 3.2. Should not be able to add beneficiaries to a pool when _tokenAmount and _addresses are of different lengths (5677ms)
      √ 3.3. Should not be able to add multiple beneficiaries to a pool when there is not enough tokens in it (5957ms)
    4. claimTokens
      √ 4.1. Should not be able to claim tokens before listing (14787ms)
      √ 4.2. A Beneficiary should not be able to claim tokens from a pool if he is not in it (13711ms)
      √ 4.3. Should not be able to claim listing tokens twice (14368ms)
      √ 4.4. Should be able to claim listing tokens during cliff period (15012ms)
      √ 4.5. Should be able to claim listing tokens + cliff tokens after cliff (16577ms)
      √ 4.6. Should be able to claim listing tokens + cliff tokens + part of vesting tokens during vesting period (15514ms)
      √ 4.7. Should be able to claim all tokens after vesting is ended (17263ms)
    5. removeBeneficiary
      √ 5.1. Should be able to remove a beneficiary from a pool before listing (8414ms)
      √ 5.2. Should be able to remove a beneficiary from a pool during cliff period when no tokens were claimed (9343ms)
      √ 5.3. Should be able to remove a beneficiary from a pool during cliff period when tokens were claimed during cliff (16531ms)
      √ 5.4. Should be able to remove a beneficiary from a pool at the beginning of vesting when no tokens were claimed (8897ms)
      √ 5.5. Should be able to remove a beneficiary from a pool at the beginning of vesting when tokens were claimed during cliff period (16208ms)
      √ 5.6. Should be able to remove a beneficiary from a pool during vesting when no tokens were claimed (14908ms)
      √ 5.7. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed during cliff (18523ms)
      √ 5.8. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed after cliff (17952ms)
      √ 5.9. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed during vesting (15328ms)
      √ 5.10. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed after vesting (14930ms)
      √ 5.11. Should not be able to claim tokens after remove (15345ms)
    6. unlockedTokenAmount (all edge cases)
      √ 6.1. Should calculate total unlocked token amount correctly (34458ms)
    7. totalUnlockedPoolTokens
      √ 7.1. Should calculate total unlocked pool tokens correctly after adding beneficiaries (14286ms)
      √ 7.2. Should calculate total unlocked pool tokens correctly after removing a beneficiary who claimed listing tokens (15088ms)
      √ 7.3. Should calculate total unlocked pool tokens correctly after a beneficiary claimed listing tokens (16220ms)


  37 passing (7m)
    }
  ```
</details>
