const inquirer = require('inquirer');
const axios = require('axios');
const { Twisters } = require('twisters');
const readlineSync = require('readline-sync');
const twisters = new Twisters();
const fs = require('fs').promises;

async function print(t_name, label, value, color) {
  const chalk = await import('chalk'); // Dynamically import chalk
  const colors = {
    green: chalk.default.green,
    red: chalk.default.red,
    yellow: chalk.default.yellow,
  };
  const paddedLabel = label.padEnd(10, ' '); // Ensure label is 10 characters long
  const coloredValue = colors[color] ? colors[color](value) : value; // Color value if applicable
  let text = ''; // Initialize text
  if (value !== '') {
    text = `${paddedLabel} : ${coloredValue}`; // When value is not empty
  }
  await twisters.put(t_name, { text }); // Send text to twisters
}

async function delay(seconds) {
  for (let i = seconds; i >= 0; i--) {
    const formattedTime = formatTime(i); // Format time to HH:MM:SS
    const color = i > 5 ? 'red' : i > 0 ? 'yellow' : 'green';
    await print('timer', 'Countdown', formattedTime, color);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await twisters.remove('timer');
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')} Hours ${String(minutes).padStart(2, '0')} Minutes ${String(secondsLeft).padStart(2, '0')} Seconds`;
  } else if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')} Minutes ${String(secondsLeft).padStart(2, '0')} Seconds`;
  } else {
    return `${secondsLeft} Seconds`;
  }
}

function getCurrentDateTime() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes}|${day}-${month}-${year}`;
}

async function fetchFakeUserData() {
  const url = 'https://cibinong.online/faker/users';
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching fake data:', error.message);
    return null;
  }
}


async function saveData(datas, filePath) {
  let data = [];
  try {
    try {
      await fs.access(filePath);
      const rawData = await fs.readFile(filePath, 'utf8');
      data = rawData.trim() ? JSON.parse(rawData) : []; // Ensure file is not empty
    } catch {
      // File does not exist, keep `data` empty
    }
    data.push(datas);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    await print('save', 'Save', 'Data saved successfully', 'green');
  } catch (err) {
    await print('error', 'Save', `Failed to save data: ${err.message}`, 'red');
  }
}

async function readAccounts(filePath) {
  try {
    return await fs.readFile(filePath) ? JSON.parse(await fs.readFile(filePath, 'utf8')) : [];
  } catch (error) {
    console.error('Error reading accounts:', error.message);
    return [];
  }
};


async function postData(url, data, params, headers) {
  try {
    const response = await axios.post(url, data, {
      params,
      headers
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function login(email, password, headers) {
  try {
    const response = await axios.post('https://faucetearner.org/api.php', {'email': email, 'password': password},{
      params: {
        'act': 'login'
      },
      headers,
      timeout: 5000,
    });
    const setCookieHeader = response.headers.get('set-cookie');
    return setCookieHeader;
  } catch (error) {
    return null;
  }
}

function createHeaders(userAgent, cookie) {
  return {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'en',
    'content-type': 'application/json',
    'origin': 'https://faucetearner.org',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': userAgent,
    'x-requested-with': 'XMLHttpRequest',
    ...(cookie && { 'cookie': cookie }), // Add cookie if available
  };
}

(async () => {
  console.clear()
  const filePath = 'earner.json';
  const { choice: menu } = await inquirer.default.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Choose menu',
      choices: [
        { name: 'Input Account', value: 1 },
        { name: 'Faucet', value: 2 },
      ],
    },
  ]);

  // await userInfo()
  console.clear()

  if(menu === 1){
    console.clear()
    const email = readlineSync.question('Email: ');
    if (!email.trim()) { // Validate if email is empty
        console.log('Email cannot be empty. Exiting program.');
    }
    const password = readlineSync.question('Password: ');
    const { userAgent } = await fetchFakeUserData();
    const headers = createHeaders(userAgent);
    const loginResult = await login(email, password, headers);
    if (loginResult != null) {
        const cookie = `${loginResult[1].split(' ')[0]}`;
        await print('email', 'Email', email, '');
        await print('login', 'Login', 'Success', 'green');
        await saveData({ email, addres: '', tag: '', cookie, userAgent }, filePath);
      } else {
      await print('login', 'Login', 'Login failed. Please try again.', 'red');
    }
    process.exit(0)
  }

  if(menu == 2){
    while(true){
      const accounts = await readAccounts(filePath);
      await print('det', 'Info', `${accounts.length} Accounts`, 'green');
      if(accounts.length !=0){
        const headersCheck = createHeaders(accounts[0].userAgent, accounts[0].cookie);
        const getTime = await postData('https://faucetearner.org/api.php', {}, {act: 'get_faucet'}, headersCheck);
        const waitTime = 60 - (getTime?.message?.s || 0);
        await delay(waitTime)
          const tasks = accounts.map(async (account, index) => {
            try {
              const headers = createHeaders(account.userAgent, account.cookie);
              const claim = await postData('https://faucetearner.org/api.php', {}, { act: 'faucet' }, headers);
              if (claim) {
                await print('email', 'Email', account.email, '');
                const match = claim.message.match(/<span[^>]*>(.*?)<\/span>/);
                if (match && match[1]) {
                  await print('claim', 'Claim', match[1], 'green');
                } else {
                  await print('claim', 'Claim', 'No claim found', 'yellow');
                }
              }else{
                await print('claim', 'Claim', 'Unknown error', 'red');
              }
            } catch (error) {
              await print('claim', 'Claim', error.message, 'red');
            }
          });
        await Promise.all(tasks);
      }else{
        await print('accounts', 'Accounts', 'You do not have any accounts', 'yellow');
      }
    }
  }
})();
