// ============================================================
// services/pushNotificationService.js
// Sends push notifications via Firebase Cloud Messaging (FCM)
// ============================================================

const admin = require("../config/firebaseAdmin");
const deviceTokenModel = require("../models/deviceTokenModel");

// ============================================================
// SEND TO A SPECIFIC USER (all their devices)
// ============================================================
//
// title/body -> what shows in the notification tray
// data       -> extra payload the app uses to navigate,
//               e.g. { type: "order_status", orderId: "123" }
//
// Never throws — a failed push should never break order flow.
// ============================================================

const sendToUser = async (userId, { title, body, data = {} }) => {
  try {
    const tokens = await deviceTokenModel.getTokensByUser(userId);

    if (!tokens.length) {
      console.log(`FRUTGO PUSH: no device tokens for user ${userId}`);
      return { success: 0, failure: 0 };
    }

    // FCM data payload values must all be strings
    const stringData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    );

    const message = {
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          channelId: "orders",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: { sound: "default" },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // ---------------------------------------------------------
    // CLEAN UP DEAD TOKENS (uninstalled app, expired token, etc.)
    // ---------------------------------------------------------

    const deadTokens = [];

    response.responses.forEach((result, index) => {
      if (!result.success) {
        const errorCode = result.error?.code || "";

        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          deadTokens.push(tokens[index]);
        }
      }
    });

    if (deadTokens.length) {
      await deviceTokenModel.removeTokens(deadTokens);
    }

    console.log(
      `FRUTGO PUSH: user ${userId} -> success=${response.successCount} failure=${response.failureCount}`
    );

    return {
      success: response.successCount,
      failure: response.failureCount,
    };
  } catch (error) {
    console.error("FRUTGO PUSH ERROR:", error);
    return { success: 0, failure: 0, error: true };
  }
};

// ============================================================
// ORDER-SPECIFIC HELPERS
// ============================================================

const STATUS_MESSAGES = {
  pending: {
    title: "Order Received 🛒",
    body: "We've received your order and are getting it ready.",
  },
  confirmed: {
    title: "Order Confirmed ✅",
    body: "Your order has been confirmed and will be packed shortly.",
  },
  out_for_delivery: {
    title: "Out for Delivery 🚴",
    body: "Your order is on its way to you!",
  },
  delivered: {
    title: "Order Delivered 📦",
    body: "Your order has been delivered. Enjoy!",
  },
  cancelled: {
    title: "Order Cancelled ❌",
    body: "Your order has been cancelled.",
  },
};

const sendOrderPlacedNotification = async (userId, order) => {
  return sendToUser(userId, {
    title: "Order Placed 🎉",
    body: `Your order #${order.id} has been placed successfully.`,
    data: {
      type: "order_status",
      orderId: order.id,
      status: "pending",
    },
  });
};

const sendOrderStatusNotification = async (userId, order) => {
  const status = order.status || "pending";

  const message =
    STATUS_MESSAGES[status] || {
      title: "Order Update",
      body: `Your order #${order.id} status changed to ${status}.`,
    };

  return sendToUser(userId, {
    title: message.title,
    body: `${message.body} (Order #${order.id})`,
    data: {
      type: "order_status",
      orderId: order.id,
      status,
    },
  });
};

module.exports = {
  sendToUser,
  sendOrderPlacedNotification,
  sendOrderStatusNotification,
};