import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: "Spin Wheel",
  },
  minBet: {
    type: Number,
    required: true,
    default: 1,
  },
  maxBet: {
    type: Number,
    required: true,
    default: 100,
  },
  outcomes: [
    {
      value: {
        type: Number,
        required: true,
      },
      probability: {
        type: Number,
        required: true,
      },
      color: {
        type: String,
        required: true,
      },
    },
  ],
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Game || mongoose.model("Game", GameSchema);
