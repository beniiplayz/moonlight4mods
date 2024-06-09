module.exports = {
  name: "ping",
  description: "Replies with the bot ping!",

  callback: async (client, interaction) => {
    await interaction.deferReply();

    const reply = await interaction.fetchReply();

    const ping = reply.createdTimestamp - interaction.createdTimestamp;

    interaction.editReply(
      `Client ${ping}ms | Websocket: ${client.ws.ping}ms`
    );
  },
};
