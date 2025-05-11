const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

// Create the message that you want to send to clients

// Send the messages
async function sendMessages() {
  try {
    const chunks = expo.chunkPushNotifications([{
      to: 'ExponentPushToken[GCb--IKscE6gdc1dGd3TBM]',
      title: 'Test',
      body: 'Test message',
      data: { type: 'test' },
      channelId: "default",
      sound: 'notification.wav'
    }]);
    const tickets = [];
    
    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

sendMessages();