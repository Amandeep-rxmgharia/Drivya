import mongoose from 'mongoose'


export async function connectDb() {
    try {
    await mongoose.connect(
      'mongodb://admin:admin@localhost:27017',{dbName: 'Drivya'}
    );
    // console.log(mongoose);
    console.log("Database connected");
  } catch (err) {
    console.log(err);
    console.log("Could Not Connect to the Database");
    process.exit(1);
  }
}


process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("Database Disconnected!");
  process.exit(0);
});
