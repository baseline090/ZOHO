// models/Lead.js
const mongoose = require('mongoose');

// Define the schema for the Lead data
const leadSchema = new mongoose.Schema({
  Company: String,
  Lead_Name: String,
  Mobile: String,
  Lead_Status: String,
  Skill_: String,
  Title: String,
  Email: String,
  Phone: String,
  Lead_Received_By: String,
  Client_Category_Emp_Size: String,
  Industry: String,
  Created_Time: String,
  Created_By: String,
  Expected_Sales_Revenue: String,
  Lead_Received_Date: String,
  Modified_Time: String,
  Modified_By: String,
  Decision_Authority: String,
  Lead_Source: String,
  Calling_Date: String,
  Zip_Code: String,
  First_Name: String,
  State: String,
  Last_Name: String,
  Salutation: String,
  Call_Status: String,
  Data_Types: String,
  Lead_Owner: String,
  Years_of_Experience: String,
  Rating: String,
  Twitter: String,
  Annual_Revenue: String,
  Description: String,
  Skype_ID: String,
  Lead_Category: String,
  Last_Activity_Time: String,
  Secondary_Email: String,
  LinkedIn_Profile: String,
  Lead_Response_Recived_source: String,
  Website: String,
});

// Create a model from the schema
const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
