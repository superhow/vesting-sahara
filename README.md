# Vesting
![Vesting Schedule](Vesting-diagram.png?raw=true) <br />
This contract implements token vesting and claiming for the specified list of beneficiaries.
Vested tokens unlocked: **daily / monthly** after the cliff period ended.

#Main code
![Vesting.sol](Vesting.sol)

## Roles
- Contract owner can add vesting pools with specified listing, cliff percentage and vesting duration.
-	Contract owner can add beneficiary wallets that are eligible for claiming tokens.
-	Contract owner can change listing date.
-	Contract owner can remove beneficiary.
-	Beneficiary can claim vested tokens if there are any.
-	All users can check vesting pool data.

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
You can now import Markdown table code directly using File/Paste table data... dialog.

## Beneficiary Parameters

| Parameter   | Type      | Explanation                                                                    |
|-------------|-----------|--------------------------------------------------------------------------------|
| poolIndex   | uint256   | Pool index                                                                     |
| addresses   | address[] | Beneficiary wallet addresses                                                   |
| tokenAmount | uint256[] | Amounts of tokens that can be claimed by beneficiaries. absolute token amount! |

Token amount for beneficiary is recalculated this way: **Total amount = Listing amount + Cliff amount + Vesting amount**

###Claiming tokens
- **If listing has started** : listing token amount;
- **If cliff has ended** : listing token amount + cliff token amount + vested unlocked tokens:
- **If vesting period ended** : transfer all allocated and unclaimed tokens.

## Deployment logic
•	We deploy a separate Vesting.sol and a TransparentUpgradeableProxy.sol contract (latter is OpenZeppelin standard and is uploaded using **truffle-upgrade plugin** (code is not stored in the repository as we use the standard library).
