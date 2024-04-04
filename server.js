require('dotenv').config()
const Koa = require('koa')
const serve = require('koa-static')
const Router = require('koa-router')
const views = require('koa-views')
const bodyParser = require('koa-bodyparser')
const mongo = require('mongodb').MongoClient
const assert = require('assert')
const express = require('express')
var routerz = express.Router();
const mongoose=require('mongoose');
var url = 'mongodb://localhost:27017';
const db = 'Node';
const moment=require('moment');
const nodemailer = require('nodemailer');

const port = process.env.PORT || 3000
const app = new Koa()
const router = new Router()

mongoose.connect('mongodb+srv://hacker:fx22rKDkhoMkY1sW@test-dajmv.mongodb.net/OPD_USERS?retryWrites=true&w=majority',{useNewUrlParser: true,
useUnifiedTopology: true,useCreateIndex:true},()=>{
  console.log("MongoDB Connected")
})

const Nexmo = require('nexmo');
const { futimesSync } = require('fs')
const nexmo = new Nexmo({
  apiKey: 'e7749a86',
  apiSecret: 'hlzmhXNkd9hq6VJ3'
});

app.use(serve('./public'))
app.use(views('./views', { map: { html: 'nunjucks' }}))
app.use(bodyParser())

const UsersymSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true,
  },
  symptom:{
    type:String,
    required:true
  },
  doctor_name:{
    type:String,
    required:true
  },
  time:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
  },
  dob:{
    type:Date,
  },
  gender:{
    type:String
  }
})

const usersymSchema=mongoose.model('SymtomsbasedUser',UsersymSchema);

router.get('/', (ctx, next) => {
  return ctx.render('./index')
})

router.post('/verify/', async (ctx, next) => {
  const payload = await ctx.request.body
  const phone = payload.phone

  const result = await verify(phone)
  const reqId = result.request_id 
  ctx.status = 200
  return ctx.render('./verify', { reqId: reqId })
})

router.post('/cancel/', async (ctx, next) => {
  const payload = await ctx.request.body
  const reqId = payload.reqId

  const result = await cancel(reqId)
  ctx.status = 200
  ctx.response.redirect('/')
})

router.post('/check/', async (ctx, next) => {
  const payload = await ctx.request.body
  const code = payload.pin
  const reqId = payload.reqId
  
  const result = await check(reqId, code)
  const status = result.status
  ctx.status = 200
  return ctx.render('./result', { status: status })
  
})

router.get('/knowdoctor/', async (ctx, next) => {
  var val = ctx.request.query.search;
  const data={name:val}
  console.log(data.name);
  return ctx.render('./knowdoctor' ,{data:data.name});

})

router.post('/knowdoctor_register/', async (ctx, next) => {
  const name=ctx.request.body.name;
  const symptom=ctx.request.body.symptoms;
  const doctor=ctx.request.body.drname;
  const time=ctx.request.body.time;
  const email=ctx.request.body.email;
  const date=ctx.request.body.date;
  const gender=ctx.request.body.gender;
  const sym_patient=new usersymSchema({
    name:name,
    symptom:symptom,
    doctor_name:doctor,
    time:time,
    email:email,
    date:date,
    gender:gender
  })
  sym_patient.save((err)=>{
    if(err){
      console.log(err)
    }
    else{
      console.log("Data Saved")

    }
  })
  ctx.status = 200
  console.log(sym_patient);
  return ctx.render('./next',{data:sym_patient})
})

router.get('/success/', async (ctx, next) =>{
  return ctx.render('./success');
});

router.post('/email/', async (ctx, next) => {
    const output = `
    <h3>Token Details</h3>
    <ul>  
      <li>Name: ${ctx.request.body.name}</li>
      <li>Gender: ${ctx.request.body.gender}</li>
      <li>Doctor Name: ${ctx.request.body.doctor_name}</li>
      <li>Available at: ${ctx.request.body.time}</li>
      <li>Symptom: ${ctx.request.body.symptom}</li>
    </ul>
    <h3>Message</h3>
    <p>Please Report to the Front Desk of the Hospital before 10 Mins of your Appointment.</p>
  `;
    var email = ctx.request.body.email;

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: "Yahoo",
    auth: {
        user: "opdsystem@yahoo.com",
        pass: "baxgtrsjqgmijmea"
    }
  });

  // setup email data with unicode symbols
  let mailOptions = {
      from: 'opdsystem@yahoo.com', // sender address
      to: email, // list of receivers
      subject: 'Appointment', // Subject line
      text: `Hello ${ctx.request.body.name}`, // plain text body
      html: output // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: %s', info.messageId);   
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

      return ctx.response.redirect('/success');
  });
  return ctx.response.redirect('/success');
});

app.use(router.routes()).use(router.allowedMethods())

app.listen(port, "0.0.0.0", () => console.log(`Server started on port ${port}`));

async function verify(number) {
  return new Promise(function(resolve, reject) {
    nexmo.verify.request({
      number: number,
      brand: 'Vonage'
    }, (err, result) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

async function check(reqId, code) {
  return new Promise(function(resolve, reject) {
    nexmo.verify.check({
      request_id: reqId,
      code: code
    }, (err, result) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

async function cancel(reqId) {
  return new Promise(function(resolve, reject) {
    nexmo.verify.control({
      request_id: reqId,
      cmd: 'cancel'
    }, (err, result) => {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}
