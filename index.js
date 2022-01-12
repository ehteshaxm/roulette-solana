const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const { Keypair } = require('@solana/web3.js');

const { getWalletBalance, transferSOL, airDropSol } = require('./solana');
const { getReturnAmount, totalAmtToBePaid, randomNumber } = require('./helper');

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync('SOL Stake', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
  console.log(chalk.yellow`The max bidding amount is 2.5 SOL here`);
};

const userPublicKey = [
  137, 61, 52, 236, 21, 171, 20, 232, 228, 148, 63, 212, 92, 46, 250, 118, 35,
  243, 128, 176, 173, 32, 82, 40, 81, 178, 19, 1, 32, 4, 97, 235,
];

const userSecretKey = [
  169, 2, 194, 213, 212, 144, 23, 186, 226, 45, 234, 163, 235, 49, 55, 61, 177,
  0, 116, 1, 204, 252, 172, 234, 209, 129, 93, 158, 57, 94, 49, 83, 137, 61, 52,
  236, 21, 171, 20, 232, 228, 148, 63, 212, 92, 46, 250, 118, 35, 243, 128, 176,
  173, 32, 82, 40, 81, 178, 19, 1, 32, 4, 97, 235,
];

const userWallet = Keypair.fromSecretKey(Uint8Array.from(userSecretKey));

//Treasury
const secretKey = [
  169, 2, 194, 213, 212, 144, 23, 186, 226, 45, 234, 163, 235, 49, 55, 61, 177,
  0, 116, 1, 204, 252, 172, 234, 209, 129, 93, 158, 57, 94, 49, 83, 137, 61, 52,
  236, 21, 171, 20, 232, 228, 148, 63, 212, 92, 46, 250, 118, 35, 243, 128, 176,
  173, 32, 82, 40, 81, 178, 19, 1, 32, 4, 97, 235,
];

const treasuryWallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

const askQuestions = () => {
  const questions = [
    {
      name: 'SOL',
      type: 'number',
      message: 'What is the amount of SOL you want to stake?',
    },
    {
      type: 'rawlist',
      name: 'RATIO',
      message: 'What is the ratio of your staking?',
      choices: ['1:1.25', '1:1.5', '1.75', '1:2'],
      filter: function (val) {
        const stakeFactor = val.split(':')[1];
        return stakeFactor;
      },
    },
    {
      type: 'number',
      name: 'RANDOM',
      message: 'Guess a random number from 1 to 5 (both 1, 5 included)',
      when: async (val) => {
        if (parseFloat(totalAmtToBePaid(val.SOL)) > 5) {
          console.log(
            chalk.red`You have violated the max stake limit. Stake with smaller amount.`
          );
          return false;
        } else {
          // console.log("In when")
          console.log(
            `You need to pay ${chalk.green`${totalAmtToBePaid(
              val.SOL
            )}`} to move forward`
          );
          const userBalance = await getWalletBalance(
            userWallet.publicKey.toString()
          );
          if (userBalance < totalAmtToBePaid(val.SOL)) {
            console.log(
              chalk.red`You don't have enough balance in your wallet`
            );
            return false;
          } else {
            console.log(
              chalk.green`You will get ${getReturnAmount(
                val.SOL,
                parseFloat(val.RATIO)
              )} if guessing the number correctly`
            );
            return true;
          }
        }
      },
    },
  ];
  return inquirer.prompt(questions);
};

const gameExecution = async () => {
  init();
  const generateRandomNumber = randomNumber(1, 5);
  const answers = await askQuestions();
  if (answers.RANDOM) {
    const paymentSignature = await transferSOL(
      userWallet,
      treasuryWallet,
      totalAmtToBePaid(answers.SOL)
    );
    console.log(
      `Signature of payment for playing the game`,
      chalk.green`${paymentSignature}`
    );
    if (answers.RANDOM === generateRandomNumber) {
      //AirDrop Winning Amount
      await airDropSol(
        treasuryWallet,
        getReturnAmount(answers.SOL, parseFloat(answers.RATIO))
      );
      //guess is successfull
      const prizeSignature = await transferSOL(
        treasuryWallet,
        userWallet,
        getReturnAmount(answers.SOL, parseFloat(answers.RATIO))
      );
      console.log(chalk.green`Your guess is absolutely correct`);
      console.log(
        `Here is the price signature `,
        chalk.green`${prizeSignature}`
      );
    } else {
      //better luck next time
      console.log(chalk.yellowBright`Better luck next time`);
    }
  }
};

gameExecution();
