
import express from "express";
import { startSock, getSocket, getSession } from "./wa.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

startSock();

app.get("/",(req,res)=>res.send("WA Memory Session OK"));

app.get("/session/full",(req,res)=>{
  const s=getSession();
  if(!s) return res.json({error:"no session"});
  res.json(s);
});

app.listen(PORT,()=>console.log("RUN",PORT));
