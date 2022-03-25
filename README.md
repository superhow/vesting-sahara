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
 ![Claiming](unlockedTokens.png?raw=true) <br />
- **If vesting period ended** : transfer all allocated and unclaimed tokens.

## Deployment logic
•	We deploy a separate **Vesting.sol** and a TransparentUpgradeableProxy.sol contract (latter is OpenZeppelin standard and is uploaded using [truffle-upgrades plugin](https://www.npmjs.com/package/@openzeppelin/truffle-upgrades) (code is not stored in the repository as we use the standard library).

## Tests
| Function                                   | Case                                                                                                                         | Test type | Result                                                | Status |
|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|-----------|-------------------------------------------------------|--------|
| 1.1. addVestingPool                        | Should be able to add a pool.                                                                                                | Auto      | The pool is added correctly.                          | ✅      |
| 1.2. addVestingPool                        | Should not be able to add a pool from non-owner account.                                                                     | Auto      | Reverts with a custom message.                        | ✅      |
| 1.3. addVestingPool                        | Should not be able to add a pool when _listingPercentageDivisor==0.                                                          | Auto      | Reverts with a custom message.                        | ✅      |
| 1.4. addVestingPool                        | Should not be able to add a pool when _cliffPercentageDivisor==0.                                                            | Auto      | Reverts with a custom message.                        | ✅      |
| 1.5. addVestingPool                        | Should not be able to add a pool when _cliffPercentageDivisor==0 and _listingPercentageDivisor==0.                           | Auto      | Reverts with a custom message.                        | ✅      |
| 1.6. addVestingPool                        | Should not be able to add a pool when pool cliff Percentage + pool listing Percentage > 100.                                 | Auto      | Reverts with a custom message.                        | ✅      |
| 2.1. addToBeneficiariesList                | Should be able to add a beneficiary to a pool.                                                                               | Auto      | The beneficiary is added correctly.                   | ✅      |
| 2.2. addToBeneficiariesList                | Should not be able to add a beneficiary from a non-owner account.                                                            | Auto      | Reverts with a custom message.                        | ✅      |
| 2.3. addToBeneficiariesList                | Should not be able to add a beneficiary when _tokenAmount == 0.                                                              | Auto      | Reverts with a custom message.                        | ✅      |
| 2.4. addToBeneficiariesList                | Should not be able to add a beneficiary to a non-existing pool.                                                              | Auto      | Reverts with a custom message.                        | ✅      |
| 2.5. addToBeneficiariesList                | Should not be able to add a beneficiary to a pool when _tokenAmount exceeds pool.totalPoolTokenAmount-pool.lockedPoolTokens  | Auto      | Reverts with a custom message.                        | ✅      |
| 2.6. addToBeneficiariesList                | Should be able to add a beneficiary to a pool twice.                                                                         | Auto      | The beneficiary is added correctly.                   | ✅      |
| 3.1. addToBeneficiariesListMultiple        | Should not be able to add beneficiaries to a pool from a non-owner account.                                                  | Auto      | Reverts with a custom message.                        | ✅      |
| 3.2. addToBeneficiariesListMultiple        | Should not be able to add beneficiaries to a pool when _tokenAmount and _addresses are of different lengths.                 | Auto      | Reverts with a custom message.                        | ✅      |
| 3.3. addToBeneficiariesListMultiple        | Should not be able to add multiple beneficiaries to a pool when there is not enough tokens in it.                            | Auto      | Reverts with a custom message.                        | ✅      |
| 4.1. claimTokens                           | Should not be able to claim tokens before listing.                                                                           | Auto      | Reverts with a custom message.                        | ✅      |
| 4.2. claimTokens                           | A Beneficiary should not be able to claim tokens from a pool if he is not in it.                                             | Auto      | Reverts with a custom message.                        | ✅      |
| 4.3. claimTokens                           | Should not be able to claim listing tokens twice.                                                                            | Auto      | Reverts with a custom message.                        | ✅      |
| 4.4. claimTokens                           | Should be able to claim listing tokens during cliff period.                                                                  | Auto      | The tokens are claimed correctly.                     | ✅      |
| 4.5. claimTokens                           | Should be able to claim listing tokens + cliff tokens after cliff.                                                           | Auto      | The tokens are claimed correctly.                     | ✅      |
| 4.6. claimTokens                           | Should be able to claim listing tokens + cliff tokens + part of vesting tokens during vesting period.                        | Auto      | The tokens are claimed correctly.                     | ✅      |
| 4.7. claimTokens                           | Should be able to claim all tokens after vesting is ended.                                                                   | Auto      | The tokens are claimed correctly.                     | ✅      |
| 5.1. removeBeneficiary                     | Should be able to remove a beneficiary from a pool before listing.                                                           | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.2. removeBeneficiary                     | Should be able to remove a beneficiary from a pool during cliff period when no tokens were claimed.                          | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.3 removeBeneficiary                      | Should be able to remove a beneficiary from a pool during cliff period when tokens were claimed during cliff.                | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.4. removeBeneficiary                     | Should be able to remove a beneficiary from a pool at the beginning of vesting when no tokens were claimed.                  | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.5. removeBeneficiary                     | Should be able to remove a beneficiary from a pool at the beginning of vesting when tokens were claimed during cliff period. | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.6. removeBeneficiary                     | Should be able to remove a beneficiary from a pool during vesting when no tokens were claimed.                               | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.7. removeBeneficiary                     | Should be able to remove a beneficiary from a pool during vesting when tokens were claimed during cliff.                     | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.8. removeBeneficiary                     | Should be able to remove a beneficiary from a pool during vesting when tokens were claimed after cliff.                      | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.9. removeBeneficiary                     | Should be able to remove a beneficiary from a pool during vesting when tokens were claimed during vesting.                   | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.10. removeBeneficiary                    | Should be able to remove a beneficiary from a pool during vesting when tokens were claimed after vesting.                    | Auto      | The beneficiary is removed correctly.                 | ✅      |
| 5.11. removeBeneficiary                    | Should not be able to claim tokens after remove.                                                                             | Auto      | Reverts with a custom message.                        | ✅      |
| 6.1. unlockedTokenAmount  (all edge cases) | Should calculate total unlocked token amount correctly.                                                                      | Auto      | Function works as expected.                           | ✅      |
| 7.1. totalUnclaimedPoolTokens              | Should calculate total unclaimed pool tokens correctly after adding beneficiaries.                                           | Auto      | Total unclaimed pool tokens are calculated correctly. | ✅      |
| 7.2. totalUnclaimedPoolTokens              | Should calculate total unclaimed pool tokens correctly after removing a beneficiary who claimed listing tokens.              | Auto      | Total unclaimed pool tokens are calculated correctly. | ✅      |
| 7.3. totalUnclaimedPoolTokens              | Should calculate total unclaimed pool tokens correctly after a beneficiary claimed listing tokens.                           | Auto      | Total unclaimed pool tokens are calculated correctly. | ✅      |
