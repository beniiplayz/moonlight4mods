module.exports = {
  name: "ping",
  description: "Válaszidő lekérdezése",

  callback: async (client, interaction) => {
    await interaction.deferReply();

    const reply = await interaction.fetchReply();

    const ping = reply.createdTimestamp - interaction.createdTimestamp;

    interaction.editReply(
      `🤵 Kliens: ${ping}ms \🌐/ 🗄️ Websocket: ${client.ws.ping}ms`
    );
  },
};
