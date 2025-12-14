
import makeWASocket, { useMemoryAuthState, fetchLatestBaileysVersion } from "@adiwajshing/baileys";
import qrcode from "qrcode-terminal";

let socketInstance=null;
let sessionState=null;

export async function startSock(){
 const {state,saveCreds}=useMemoryAuthState();
 sessionState=state;
 const {version}=await fetchLatestBaileysVersion();
 const sock=makeWASocket({version,auth:state,printQRInTerminal:true,syncFullHistory:true});
 sock.ev.on("creds.update",saveCreds);
 sock.ev.on("connection.update",(u)=>{
   if(u.qr) qrcode.generate(u.qr,{small:true});
   if(u.connection==="open") console.log("WA CONNECTED");
   if(u.connection==="close") startSock();
 });
 socketInstance=sock;
}
export function getSocket(){return socketInstance;}
export function getSession(){return sessionState;}
