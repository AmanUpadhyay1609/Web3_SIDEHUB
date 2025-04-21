import BigNumber from "bignumber.js";
import { kolReferralAddress, priorityReferralAddress } from "../services/chains/solana/constants";

export const amountDistribution = (
  amount: number,
  percentage: number,
  isReferralDeduction: boolean,
  referralAddress: string
) => {
  try {
    console.log("the parameter in the amount distribution ",amount,percentage,isReferralDeduction,referralAddress)
    const amountInBigNumber = new BigNumber(amount);
    console.log(
      "amountInBigNumber......insidedistribution.",
      amountInBigNumber,amount
    );

    const fees = amountInBigNumber.multipliedBy(percentage);
    // const swapAmount = amountInBigNumber.multipliedBy(1 - percentage);
    const swapAmount = amountInBigNumber.multipliedBy(1);
    
    const swapAmountInNormal = BigNumber(swapAmount.integerValue())

    console.log("swapAmountInNormal.................",swapAmountInNormal);
    // const porfoAmount = BigNumber(amountData.porfoAmount)
    //   .integerValue(BigNumber.ROUND_DOWN)
    //   .toFixed(0);
    // const referralAmount = BigNumber(amountData.referralAmount)
    //   .integerValue(BigNumber.ROUND_DOWN)
    //   .toFixed(0);
    console.log("swapAmount inside amountDeistrubution.....................",swapAmount);



    const porfoPercentage = isReferralDeduction
      ? priorityReferralAddress.includes(referralAddress)
        ? 0.7 // if referral is in priority list then 70% deduction of fees to wstf means referral goes to 30% of fees
        : kolReferralAddress.includes(referralAddress)
        ? 0.85 // if referral is in priority list then 85% deduction of fees to wstf means referral goes to 15% of fees
        : 0.9 // by default referral goes to 10% of fees means 90% deduction of fees to wstf
      : 1;


    console.log("profo Percentage.............insideAmountDist..........",porfoPercentage);
    const porfoContribution = fees.multipliedBy(porfoPercentage);
    const referralContribution = fees.minus(porfoContribution);

    console.log("porfo Contribution..........",porfoContribution);
    console.log("referral..........",referralContribution);
    const totalAmount = swapAmount
      .plus(porfoContribution)
      .plus(referralContribution)
      .toFixed(0);
    console.log("total of distribution.......", totalAmount.toString());
    return {
      swapAmount: swapAmount,
      porfoAmount: porfoContribution,
      referralAmount: referralContribution,
    };
  } catch (error) {
    console.log("error in amountDistribution.......", error);
    throw new Error("Error in amount distribution")
  }
};