require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const axios = require("axios");
const eventHandler = require("./handlers/eventHandler");

const pastebinApiKey = process.env.PASTEBIN_API_KEY;
const pastebinUsername = process.env.PASTEBIN_USERNAME;
const pastebinPassword = process.env.PASTEBIN_PASSWORD;

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
});

eventHandler(client);

async function getPastebinUserKey() {
  try {
    const response = await axios.post(
      "https://pastebin.com/api/api_login.php",
      new URLSearchParams({
        api_dev_key: pastebinApiKey,
        api_user_name: pastebinUsername,
        api_user_password: pastebinPassword,
      })
    );
    return response.data;
  } catch (error) {
    console.error("Hiba történt a Pastebin API elérése közben:", error);
    throw error;
  }
}

let messageBuffer = [];
let uploadTimeout;

client.on("messageCreate", (message) => {
  if (
    /easter\s*egg/i.test(message.content) &&
    message.author != client.user &&
    !message.author.bot
  ) {
    message.reply(":nest_with_eggs: :rabbit:");
  }
  if (message.content != "") {
    const currentMessage = `❇️  => ${message.author.username} ${message.author}: ${message.content} || ID: ${message.id}, #${message.channel.name}`;
    console.log(currentMessage);

    messageBuffer.push(currentMessage);

    if (uploadTimeout) {
      clearTimeout(uploadTimeout);
    }

    uploadTimeout = setTimeout(() => {
      uploadToPastebin(messageBuffer);
      messageBuffer = [];
    }, 30 * 1000);
  }
});

async function uploadToPastebin(messages) {
  try {
    const userKey = await getPastebinUserKey();
    const currentMessage = messages.join("\n").trim();

    if (currentMessage.length === 0) {
      console.log("Nincs üzenet, amit fel lehetne tölteni.");
      return;
    }

    const payload = new URLSearchParams({
      api_dev_key: pastebinApiKey,
      api_user_key: userKey,
      api_option: "paste",
      api_paste_code: currentMessage,
      api_paste_private: "0",
      api_paste_name: "Discord üzenetek",
      api_paste_expire_date: "N",
    });

    const response = await axios.post(
      "https://pastebin.com/api/api_post.php",
      payload
    );
    console.log("Pastebin URL:", response.data);
  } catch (error) {
    console.error(
      "Hiba történt, az üzenetek feltöltése kudarcba fulladt:",
      error
    );
  }
}

client.login(process.env.DISCORD_TOKEN);
