const { ActivityType } = require("discord.js");

module.exports = (client) => {
  console.log(`A bot rajtra kész🤺 ${client.user.tag}`);
  client.user.setStatus("online");

  let status = [
    {
      name: "Big Gaming Team",
      type: ActivityType.Watching,
    },
    {
      name: "BeniiPlayZ",
      type: ActivityType.Watching,
    },
    {
      name: "Tomi ツ",
      type: ActivityType.Watching,
    },
    {
      name: "Gondaaa",
      type: ActivityType.Watching,
    },
  ]

  setInterval(() => {
    let random = Math.floor(Math.random() * status.length);
    client.user.setActivity(status[random]);
  }, 10000);
};
