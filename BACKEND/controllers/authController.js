import mongoose, { Types } from "mongoose";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";

export const register = async (req, res, next) => {
  console.log(req.body);
  const { name, email, contact, password } = req.body;
  const session = await mongoose.startSession();
  const rootDirId = new Types.ObjectId();
  try {
    session.startTransaction();
    const userId = await User.insertOne(
      {
        name,
        email,
        password,
        contact,
        rootDirId,
      },
      { session },
    );
    await Directory.insertOne(
      {
        name: `root@${email}`,
        userId,
      },
      { session },
    );
    session.commitTransaction();
    return res.json({ message: "register successfull!" });
  } catch (err) {
    session.abortTransaction();
    console.log(err);
    if(err?.errorResponse.code === 11000) return res.status(409).json({message: "user already exist!"})
    console.log(err);
    next(err);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const userId = await User.findOne({ email, password }).lean().select("id");
    if (!userId) return res.status(404).json({ message: "User not exist!" });
    return res.json({ message: "login successfull!" });
  } catch (err) {
    next(err);
  }
};
