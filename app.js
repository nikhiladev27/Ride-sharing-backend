const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));;

mongoose.connect("mongodb+srv://nikhilad2023cce:nikhila27@cluster0.10i6nok.mongodb.net/rideSharingDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));


const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});

const User = mongoose.model("User", userSchema);


const rideSchema = new mongoose.Schema({
    driverName: String,
    pickupLocation: String,
    dropLocation: String,
    date: Date,
    seatsAvailable: Number,
    driverGender: String,
    petFriendly: Boolean, 
    price: Number,
   
});

const Ride = mongoose.model("Ride", rideSchema);


app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email" });
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(400).json({ message: "Invalid password" });
        const token = jwt.sign({ id: user._id }, "secret_key", { expiresIn: "1h" });
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});


app.post("/post-ride", async (req, res) => {
    const { driverName, pickupLocation, dropLocation, date, seatsAvailable, driverGender, petFriendly, price } = req.body;
    try {
        const newRide = new Ride({ driverName, pickupLocation, dropLocation, date, seatsAvailable, driverGender, petFriendly ,price});
        await newRide.save();
        res.status(201).json({ message: "Ride posted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to post ride", error });
    }
});


app.post("/book-ride", async (req, res) => {
    const { rideId, userId } = req.body; // Expecting both rideId and userId in the body
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
  
      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      if (ride.seatsAvailable <= 0) {
        return res.status(400).json({ message: "No seats available" });
      }
  
      ride.seatsAvailable -= 1;
      ride.passengerName = user.name;
      ride.passengerEmail = user.email;
  
      await ride.save();
  
      res.status(200).json({ message: "Ride booked successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error booking ride", error });
    }
  });
  


app.get("/rides", async (req, res) => {
    try {
        const rides = await Ride.find();
        res.status(200).json(rides);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch rides", error });
    }
});

app.get("/rides/:rideId", async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.rideId);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }
        res.status(200).json(ride);
    } catch (error) {
        console.error("Error fetching ride:", error);
        res.status(500).json({ message: "Error fetching ride details", error });
    }
});

app.get("/user", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1]; 

    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, "secret_key"); // Verify the token
        const user = await User.findById(decoded.id); // Retrieve the user by ID from the token

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user); // Send the user details back
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error });
    }
});



// app.post("/book-ride", async (req, res) => {
//     const { rideId } = req.body;

//     try {
//         const ride = await Ride.findById(rideId);
//         if (!ride || ride.seatsAvailable <= 0) {
//             return res.status(400).json({ message: "Ride not available" });
//         }

    
//         ride.seatsAvailable -= 1;
//         await ride.save();

//         res.status(200).json({ message: "Ride booked successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Error booking ride", error });
//     }
// });

app.post("/book-ride", async (req, res) => {
    const { rideId, userId } = req.body; // Expecting both rideId and passenger details

    try {

        const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

        // Retrieve ride details
        const ride = await Ride.findById(rideId);
        if (!ride || ride.seatsAvailable <= 0) {
            return res.status(400).json({ message: "Ride not available" });
        }

        // Decrease the seats available for the ride
        ride.seatsAvailable -= 1;
        
        // Optionally, you can store the passenger's name and email in the ride for temporary tracking
        ride.passengerName = user.name; // Temporarily store passenger's name
        ride.passengerEmail = user.email; // Temporarily store passenger's email

        // Save the updated ride details
        await ride.save();

        res.status(200).json({ message: "Ride booked successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error booking ride", error });
    }
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
