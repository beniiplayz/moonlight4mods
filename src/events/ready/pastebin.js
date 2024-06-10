const axios = require("axios");

const pastebinApiKey = process.env.PASTEBIN_API_KEY;
const pastebinUsername = process.env.PASTEBIN_USERNAME;
const pastebinPassword = process.env.PASTEBIN_PASSWORD;

module.exports = (client) => {
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
          console.error("🫳 Hiba akadt a Pastebin API elérése közben:", error);
          throw error;
        }
      }
      
      let messageBuffer = [];
      let uploadTimeout;
      
      client.on("messageCreate", (message) => {
        if (message.content != "") {
          const currentMessage = `#${message.channel.name} => ${message.author.username} ${message.author}: ${message.content} / Üzenetazonosító: ${message.id}`;
          console.log("📩", currentMessage);
          
          const guildName = message.guild.name
      
          messageBuffer.push(currentMessage);
      
          if (uploadTimeout) {
            clearTimeout(uploadTimeout);
          }
      
          uploadTimeout = setTimeout(() => {
            uploadToPastebin(messageBuffer, guildName);
            messageBuffer = [];
          }, 30 * 1000);
        }
      });
      
      async function uploadToPastebin(messages, guildName) {
        try {
          const userKey = await getPastebinUserKey();
          const currentMessage = messages.join("\n").trim();
          const messagesLength = messages.length
      
          if (currentMessage.length === 0) {
            console.log("😶 Nincs üzenet, amit fel lehetne tölteni.");
            return;
          }
      
          const payload = new URLSearchParams({
            api_dev_key: pastebinApiKey,
            api_user_key: userKey,
            api_option: "paste",
            api_paste_code: currentMessage,
            api_paste_private: "0",
            api_paste_name: `📫 ${guildName} - ${messagesLength} új üzenet 📦`,
            api_paste_expire_date: "N",
          });
      
          const response = await axios.post(
            "https://pastebin.com/api/api_post.php",
            payload
          );
          console.log("🚀 Pastebin URL:", response.data);
        } catch (error) {
          console.error(
            "💥 Hiba akadt, az üzenetek feltöltése kudarcba fulladt:",
            error
          );
        }
      }
};