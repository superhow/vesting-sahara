const MockToken = artifacts.require("MockToken");
const VestingMain = artifacts.require("VestingMock");

const Chance = require("chance");
const assert = require("assert");

contract("VestingMain", async (accounts) => {
  if (accounts.length < 7) {
    throw new Error("Too few accounts");
  } else {
    accounts = new Chance().pickset(accounts, 7);
    console.log("7 accounts taken for testing");
  }

  async function createFixtures() {
    const chance = new Chance();
    const owner = chance.pickone(accounts);
    const token = await MockToken.new({ from: owner });
    const vestingMain = await VestingMain.new();
    await vestingMain.initialize(token.address, 1000000, { from: owner });
    return [chance, owner, vestingMain, token];
  }

  async function createFixturesWithTokenDistribution() {
    const [chance, owner, vestingPools, token] = await createFixtures();
    for (const acc of accounts) {
      if (acc != owner) {
        await token.approve(owner, "9000000", { from: owner });
        await token.transferFrom(owner, acc, "1000000", {
          from: owner,
        });
      }
    }
    await token.transferFrom(owner, vestingPools.address, "1000000", {
      from: owner,
    });
    return [chance, owner, vestingPools, token];
  }

  async function addNormalVestingPool_Test1(vestingPools, owner) {
    await vestingPools.addVestingPool(
      "Test1",
      1,
      20,
      1,
      1,
      10,
      3,
      VestingMain.UnlockTypes.MONTHLY,
      "10000000000000000000000",
      { from: owner }
    );
  }

  async function checkPoolState(
    _vestingPools,
    _poolIndex,
    _name,
    _listingPercentageDividend,
    _listingPercentageDivisor,
    _cliffDays,
    _cliffPercentageDividend,
    _cliffPercentageDivisor,
    _vestingDurationInMonths,
    _unlockType,
    _totalPoolTokenAmount,
    _lockedPoolTokens
  ) {
    const result1 = await _vestingPools.getVestingPoolDataPart1_TEST(
      _poolIndex
    );
    const result2 = await _vestingPools.getVestingPoolDataPart2_TEST(
      _poolIndex
    );
    const name = result1[0];
    const listingPercentageDividend = result1[1];
    const listingPercentageDivisor = result1[2];
    const cliffDays = result1[3];
    const cliffEndDate = result1[4];
    const cliffPercentageDividend = result1[5];
    const cliffPercentageDivisor = result1[6];
    const vestingDurationInMonths = result2[0];
    const vestingDurationInDays = result2[1];
    const vestingEndDate = result2[2];
    const unlockType = result2[3];
    const totalPoolTokenAmount = result2[4];
    const lockedPoolTokens = result2[5];
    const listingDate = await _vestingPools.getListingDate_TEST();

    assert.equal(name, "Test1", "name is incorrect");
    assert.equal(
      listingPercentageDividend,
      _listingPercentageDividend,
      "listingPercentageDividend is incorrect"
    );
    assert.equal(
      listingPercentageDivisor,
      _listingPercentageDivisor,
      "listingPercentageDivisor is incorrect"
    );
    assert.equal(cliffDays, _cliffDays, "cliffInDays is incorrect");
    assert.equal(
      cliffPercentageDividend,
      _cliffPercentageDividend,
      "cliffPercentageDividend is incorrect"
    );
    assert.equal(
      cliffPercentageDivisor,
      _cliffPercentageDivisor,
      "cliffPercentageDivisor is incorrect"
    );
    assert.equal(
      vestingDurationInMonths,
      _vestingDurationInMonths,
      "vestingDurationInMonths is incorrect"
    );
    assert.equal(unlockType, _unlockType, "unlockType is incorrect");
    assert.equal(
      totalPoolTokenAmount,
      _totalPoolTokenAmount,
      "totalPoolTokenAmount is incorrect"
    );
    assert.equal(
      lockedPoolTokens,
      _lockedPoolTokens,
      "lockedPoolTokens is incorrect"
    );
    assert.equal(
      parseInt(cliffEndDate),
      parseInt(listingDate) + 24 * 3600 * cliffDays,
      "cliffEndDate is incorrect"
    );
    assert.equal(
      vestingDurationInDays,
      30 * vestingDurationInMonths,
      "vestingDurationInDays is incorrect"
    );
    assert.equal(
      parseInt(vestingEndDate),
      parseInt(cliffEndDate) + 24 * 3600 * 30 * vestingDurationInMonths,
      "vestingEndDate is incorrect"
    );
  }

  async function checkBeneficiaryState(
    _vestingPools,
    _poolIndex,
    _beneficiary,
    _isWhitelisted,
    _totalTokens,
    _listingTokenAmount,
    _cliffTokenAmount,
    _vestedTokenAmount,
    _claimedTokenAmount
  ) {
    const result = await _vestingPools.getVestingPoolBeneficiary_TEST(
      _poolIndex,
      _beneficiary
    );
    const isWhitelisted = result[0];
    const totalTokens = result[1];
    const listingTokenAmount = result[2];
    const cliffTokenAmount = result[3];
    const vestedTokenAmount = result[4];
    const claimedTotalTokenAmount = result[5];

    assert.equal(result[0], _isWhitelisted, "isWhitelisted is incorrect");
    assert.equal(result[1], _totalTokens, "totalTokens is incorrect");
    assert.equal(
      result[2],
      _listingTokenAmount,
      "listingTokenAmount is incorrect"
    );
    assert.equal(result[3], _cliffTokenAmount, "cliffTokenAmount is incorrect");
    assert.equal(
      result[4],
      _vestedTokenAmount,
      "vestedTokenAmount is incorrect"
    );
    assert.equal(
      result[5],
      _claimedTokenAmount,
      "claimedTotalTokenAmount is incorrect"
    );
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
  describe("1. addVestingPool", () => {
    it("1.1. Should be able to add a pool", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        0
      );
    });

    it("1.2. Should not be able to add a pool from non-owner account", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      let nonOwner;
      do {
        nonOwner = chance.pickone(accounts);
      } while (nonOwner == owner);
      await assert.rejects(
        async function () {
          await addNormalVestingPool_Test1(vestingPools, nonOwner);
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.",
        }
      );
    });

    it("1.3. Should not be able to add a pool when _listingPercentageDivisor==0", async () => {
      const [, owner, vestingPools] = await createFixtures();

      await assert.rejects(
        async function () {
          await vestingPools.addVestingPool(
            "Test",
            1,
            0,
            1,
            0,
            1,
            3,
            VestingMain.UnlockTypes.MONTHLY,
            "10000000000000000000000",
            { from: owner }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Percentage divisor can not be zero. -- Reason given: Percentage divisor can not be zero..",
        }
      );
    });

    it("1.4. Should not be able to add a pool when _cliffPercentageDivisor==0", async () => {
      const [, owner, vestingPools] = await createFixtures();

      await assert.rejects(
        async function () {
          await vestingPools.addVestingPool(
            "Test",
            1,
            20,
            1,
            0,
            0,
            3,
            VestingMain.UnlockTypes.MONTHLY,
            "10000000000000000000000",
            { from: owner }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Percentage divisor can not be zero. -- Reason given: Percentage divisor can not be zero..",
        }
      );
    });

    it("1.5. Should not be able to add a pool when _cliffPercentageDivisor==0 and _listingPercentageDivisor==0", async () => {
      const [, owner, vestingPools] = await createFixtures();

      await assert.rejects(
        async function () {
          await vestingPools.addVestingPool(
            "Test",
            1,
            0,
            1,
            0,
            0,
            3,
            VestingMain.UnlockTypes.MONTHLY,
            "10000000000000000000000",
            { from: owner }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Percentage divisor can not be zero. -- Reason given: Percentage divisor can not be zero..",
        }
      );
    });

    it("1.6. Should not be able to add a pool when pool cliff Percentage + pool listing Percentage > 100", async () => {
      const [, owner, vestingPools] = await createFixtures();

      await assert.rejects(
        async function () {
          await vestingPools.addVestingPool(
            "Test1",
            2,
            3,
            1,
            2,
            3,
            3,
            VestingMain.UnlockTypes.MONTHLY,
            "10000000000000000000000",
            { from: owner }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Listing and cliff percentage can not exceed 100. -- Reason given: Listing and cliff percentage can not exceed 100..",
        }
      );

      await assert.rejects(
        async function () {
          await vestingPools.addVestingPool(
            "Test2",
            2,
            1,
            1,
            1,
            1,
            3,
            VestingMain.UnlockTypes.MONTHLY,
            "10000000000000000000000",
            { from: owner }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Listing and cliff percentage can not exceed 100. -- Reason given: Listing and cliff percentage can not exceed 100..",
        }
      );

      await assert.rejects(
        async function () {
          await vestingPools.addVestingPool(
            "Test3",
            2,
            3,
            2,
            1,
            0,
            3,
            VestingMain.UnlockTypes.MONTHLY,
            "10000000000000000000000",
            { from: owner }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Percentage divisor can not be zero. -- Reason given: Percentage divisor can not be zero..",
        }
      );
    });
  });

  /**
   * @notice Adds address with purchased token amount to vesting pool.
   * @param _poolIndex Index that refers to vesting pool object.
   * @param _address Address of the beneficiary wallet.
   * @param _tokenAmount Purchased token absolute amount (with included decimals).
   */
  describe("2. addToBeneficiariesList", () => {
    it("2.1. Should be able to add a beneficiary to a pool", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await checkBeneficiaryState(
        vestingPools,
        0,
        tryer,
        true,
        199,
        9,
        19,
        171,
        0
      );
    });

    it("2.2. Should not be able to add a beneficiary from a non-owner account", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesList(0, tryer, 100, {
            from: tryer,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.",
        }
      );
    });

    it("2.3. Should not be able to add a beneficiary to a pool when _tokenAmount==0", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesList(0, tryer, 0, {
            from: owner,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Token amount can not be 0. -- Reason given: Token amount can not be 0..",
        }
      );
    });

    it("2.4. Should not be able to add a beneficiary to a non-existing pool", async () => {
      const [chance, owner, vestingPools] = await createFixtures();
      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesList(0, tryer, 200, {
            from: owner,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Pool does not exist. -- Reason given: Pool does not exist..",
        }
      );
    });

    it("2.5. Should not be able to add a beneficiary to a pool when _tokenAmount exceeds pool.totalPoolTokenAmount-pool.lockedPoolTokens", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await vestingPools.addVestingPool(
        "Test",
        1,
        20,
        1,
        0,
        1,
        3,
        VestingMain.UnlockTypes.MONTHLY,
        "100",
        { from: owner }
      );
      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesList(0, tryer, 200, {
            from: owner,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Allocated token amount will exceed total pool amount. -- Reason given: Allocated token amount will exceed total pool amount..",
        }
      );
    });

    it("2.6. Should be able to add a beneficiary to a pool twice", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 200, {
        from: owner,
      });
      await vestingPools.addToBeneficiariesList(0, tryer, 100, {
        from: owner,
      });

      const result = await vestingPools.getVestingPoolBeneficiary_TEST(
        0,
        tryer
      );
      await checkBeneficiaryState(
        vestingPools,
        0,
        tryer,
        true,
        300,
        15,
        30,
        255,
        0
      );
    });
  });

  /**
   * @notice Adds addresses with purchased token amount to the beneficiary list.
   * @param _poolIndex Index that refers to vesting pool object.
   * @param _addresses List of whitelisted addresses.
   * @param _tokenAmount Purchased token absolute amount (with included decimals).
   * @dev Example of parameters: ["address1","address2"], ["address1Amount", "address2Amount"].
   */
  describe("3. addToBeneficiariesListMultiple", () => {
    it("3.1. Should not be able to add beneficiaries to a pool from a non-owner account", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesListMultiple(
            0,
            [tryer, owner],
            [199, 5],
            {
              from: tryer,
            }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.",
        }
      );
    });

    it("3.2. Should not be able to add beneficiaries to a pool when _tokenAmount and _addresses are of different lengths", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesListMultiple(
            0,
            [owner, tryer],
            [199],
            {
              from: owner,
            }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Addresses and token amount arrays must be the same size. -- Reason given: Addresses and token amount arrays must be the same size..",
        }
      );
    });

    it("3.3. Should not be able to add multiple beneficiaries to a pool when there is not enough tokens in it", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await vestingPools.addVestingPool(
        "Test",
        1,
        20,
        1,
        0,
        1,
        3,
        VestingMain.UnlockTypes.MONTHLY,
        "300",
        { from: owner }
      );

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await assert.rejects(
        async function () {
          await vestingPools.addToBeneficiariesListMultiple(
            0,
            [owner, tryer],
            [200, 200],
            {
              from: owner,
            }
          );
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: out of gas -- Reason given: Allocated token amount will exceed total pool amount..",
        }
      );
    });
  });

  /**
   * @notice Function lets caller claim unlocked tokens from specified vesting pool.
   * @param _poolIndex Index that refers to vesting pool object.
   * if the vesting period has ended - beneficiary is transferred all unclaimed tokens.
   */
  describe("4. claimTokens", () => {
    it("4.1. Should not be able to claim tokens before listing", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(100, { from: owner });
      await assert.rejects(
        async function () {
          await vestingPools.claimTokens(0, {
            from: tryer,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert There are no claimable tokens. -- Reason given: There are no claimable tokens..",
        }
      );
      await assert;
    });
    it("4.2. A Beneficiary should not be able to claim tokens from a pool if he is not in it", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await assert.rejects(
        async function () {
          await vestingPools.claimTokens(0, {
            from: tryer,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Address is not in the whitelist. -- Reason given: Address is not in the whitelist..",
        }
      );
      await assert;
    });
    it("4.3. Should not be able to claim listing tokens twice", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, {
        from: tryer,
      });
      await assert.rejects(
        async function () {
          await vestingPools.claimTokens(0, {
            from: tryer,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert There are no claimable tokens. -- Reason given: There are no claimable tokens..",
        }
      );
      await assert;
    });
    it("4.4. Should be able to claim listing tokens during cliff period", async () => {
      const [chance, owner, vestingPools, token] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, {
        from: tryer,
      });
      assert.equal(
        await token.balanceOf(tryer),
        "1000009",
        "Beneficiary did not receive tokens"
      );

      await checkBeneficiaryState(
        vestingPools,
        0,
        tryer,
        true,
        199,
        9,
        19,
        171,
        9
      );
    });
    it("4.5. Should be able to claim listing tokens + cliff tokens after cliff", async () => {
      const [chance, owner, vestingPools, token] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000000 + 3600 * 25, {
        from: owner,
      });
      await vestingPools.claimTokens(0, {
        from: tryer,
      });
      assert.equal(
        await token.balanceOf(tryer),
        "1000028",
        "Beneficiary did not receive tokens"
      );
      await checkBeneficiaryState(
        vestingPools,
        0,
        tryer,
        true,
        199,
        9,
        19,
        171,
        28
      );
    });
    it("4.6. Should be able to claim listing tokens + cliff tokens + part of vesting tokens during vesting period", async () => {
      const [chance, owner, vestingPools, token] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 200, { from: owner });
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockMonthsTimestamp(1, { from: owner });
      await vestingPools.addMockDaysTimestamp(2, { from: owner });
      await vestingPools.claimTokens(0, {
        from: tryer,
      });
      assert.equal(
        await token.balanceOf(tryer),
        "1000086",
        "Beneficiary did not receive tokens"
      );
      await checkBeneficiaryState(
        vestingPools,
        0,
        tryer,
        true,
        200,
        10,
        20,
        170,
        86
      );
    });
    it("4.7. Should be able to claim all tokens after vesting is ended", async () => {
      const [chance, owner, vestingPools, token] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 200, { from: owner });
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockMonthsTimestamp(4, { from: owner });
      await vestingPools.claimTokens(0, {
        from: tryer,
      });
      assert.equal(
        await token.balanceOf(tryer),
        "1000200",
        "Beneficiary did not receive tokens"
      );
      await checkBeneficiaryState(
        vestingPools,
        0,
        tryer,
        true,
        200,
        10,
        20,
        170,
        200
      );
    });
  });

  /**
   * @notice Removes beneficiary from the structure.
   * @param _poolIndex Index that refers to vesting pool object.
   * @param _address Address of the beneficiary wallet.
   */
  describe("5. removeBeneficiary", () => {
    it("5.1. Should be able to remove a beneficiary from a pool before listing", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.setMockTimestamp(999, { from: owner });
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });

      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        0
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.2. Should be able to remove a beneficiary from a pool during cliff period when no tokens were claimed", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        0
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.3. Should be able to remove a beneficiary from a pool during cliff period when tokens were claimed during cliff", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        9
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.4. Should be able to remove a beneficiary from a pool at the beginning of vesting when no tokens were claimed", async () => {
      const [chance, owner, vestingPools] = await createFixtures();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockDaysTimestamp(2, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        0
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.5. Should be able to remove a beneficiary from a pool at the beginning of vesting when tokens were claimed during cliff period", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.addMockDaysTimestamp(2, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        9
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.6. Should be able to remove a beneficiary from a pool during vesting when no tokens were claimed", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.addMockMonthsTimestamp(2, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        0
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.7. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed during cliff", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.addMockMonthsTimestamp(2, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        9
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.8. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed after cliff", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.addMockDaysTimestamp(1, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.addMockMonthsTimestamp(2, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        28
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.9. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed during vesting", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.addMockMonthsTimestamp(2, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        85
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.10. Should be able to remove a beneficiary from a pool during vesting when tokens were claimed after vesting", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.addMockMonthsTimestamp(4, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await checkPoolState(
        vestingPools,
        0,
        "Test1",
        1,
        20,
        1,
        1,
        10,
        3,
        1,
        "10000000000000000000000",
        199
      );
      await checkBeneficiaryState(vestingPools, 0, tryer, false, 0, 0, 0, 0, 0);
    });
    it("5.11. Should not be able to claim tokens after remove", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.addMockMonthsTimestamp(4, { from: owner });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      await assert.rejects(
        async function () {
          await vestingPools.claimTokens(0, {
            from: tryer,
          });
        },
        {
          message:
            "Returned error: VM Exception while processing transaction: revert Address is not in the whitelist. -- Reason given: Address is not in the whitelist..",
        }
      );
      await assert;
    });
  });

  /**
   * @notice Calculates unlocked and unclaimed tokens based on the days passed.
   * @param _address Address of the beneficiary wallet.
   * @param _poolIndex Index that refers to vesting pool object.
   * @return uint256 total unlocked and unclaimed tokens.
   */
  describe("6. unlockedTokenAmount (all edge cases)", () => {
    it("6.1. Should calculate total unlocked token amount correctly", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();
      await vestingPools.addVestingPool(
        "Test",
        1,
        20,
        3,
        1,
        10,
        3,
        VestingMain.UnlockTypes.DAILY,
        "1000000000000000000000000",
        { from: owner }
      );
      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      //before listing
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.setMockTimestamp(999900, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "0",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(999999, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "0",
        "unlockedTokenAmount was calculated incorrectly"
      );
      //during cliff
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "9",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "9",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockDaysTimestamp(1, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "9",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(999999, { from: owner });
      await vestingPools.addMockDaysTimestamp(3, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "9",
        "unlockedTokenAmount was calculated incorrectly"
      );
      //after cliff
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockDaysTimestamp(3, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "28",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.addMockDaysTimestamp(3, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "28",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000010, { from: owner });
      await vestingPools.addMockDaysTimestamp(3, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "28",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(999999, { from: owner });
      await vestingPools.addMockDaysTimestamp(4, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "28",
        "unlockedTokenAmount was calculated incorrectly"
      );
      //during the first vesting stage
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockDaysTimestamp(4, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "29",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.addMockDaysTimestamp(4, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "29",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000010, { from: owner });
      await vestingPools.addMockDaysTimestamp(4, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "29",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(999999, { from: owner });
      await vestingPools.addMockDaysTimestamp(5, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "29",
        "unlockedTokenAmount was calculated incorrectly"
      );
      //during the second vesting stage
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockDaysTimestamp(5, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "31",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.addMockDaysTimestamp(5, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "31",
        "unlockedTokenAmount was calculated incorrectly"
      );
      await vestingPools.setMockTimestamp(1000010, { from: owner });
      await vestingPools.addMockDaysTimestamp(5, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "31",
        "unlockedTokenAmount was calculated incorrectly"
      );
      //during the second last vesting stage
      await vestingPools.setMockTimestamp(999999, { from: owner });
      await vestingPools.addMockDaysTimestamp(93, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "197",
        "unlockedTokenAmount was calculated incorrectly"
      );
      //during the last vesting stage
      await vestingPools.setMockTimestamp(1000000, { from: owner });
      await vestingPools.addMockDaysTimestamp(93, { from: owner });
      assert.equal(
        await vestingPools.unlockedTokenAmount(0, tryer),
        "199",
        "unlockedTokenAmount was calculated incorrectly"
      );
    });
  });

  /**
   * @notice Checks how many tokens unlocked in a pool (not allocated to any user).
   * @param _poolIndex Index that refers to vesting pool object.
   */
  describe("7. totalUnclaimedPoolTokens", () => {
    it("7.1. Should calculate total unclaimed pool tokens correctly after adding beneficiaries", async () => {
      const [, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      await vestingPools.addToBeneficiariesList(0, owner, 199, { from: owner });
      await vestingPools.addToBeneficiariesList(0, owner, 199, { from: owner });
      await vestingPools.setMockTimestamp(10000, { from: owner });
      assert.equal(
        await vestingPools.totalUnclaimedPoolTokens(0),
        "9999999999999999999602",
        "Total unclaimed pool tokens were calculated incorrectly"
      );
    });
    it("7.2. Should calculate total unclaimed pool tokens correctly after removing a beneficiary who claimed listing tokens", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.addToBeneficiariesList(0, owner, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      await vestingPools.removeBeneficiary(0, tryer, { from: owner });
      assert.equal(
        await vestingPools.totalUnclaimedPoolTokens(0),
        "9999999999999999999792",
        "Total unclaimed pool tokens were calculated incorrectly"
      );
    });
    it("7.3. Should calculate total unclaimed pool tokens correctly after a beneficiary claimed listing tokens", async () => {
      const [chance, owner, vestingPools] =
        await createFixturesWithTokenDistribution();

      await addNormalVestingPool_Test1(vestingPools, owner);

      let tryer;
      do {
        tryer = chance.pickone(accounts);
      } while (tryer == owner);
      await vestingPools.addToBeneficiariesList(0, tryer, 199, { from: owner });
      await vestingPools.addToBeneficiariesList(0, owner, 199, { from: owner });
      await vestingPools.setMockTimestamp(1000001, { from: owner });
      await vestingPools.claimTokens(0, { from: tryer });
      assert.equal(
        await vestingPools.totalUnclaimedPoolTokens(0),
        "9999999999999999999602",
        "Total unclaimed pool tokens were calculated incorrectly"
      );
    });
  });
});
