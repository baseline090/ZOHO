
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Lead = require('./models/Lead');
const { MONGO_URI, PORT } = process.env;
const axios = require("axios");
const { getAccessToken } = require('./config/zcrm_config');


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));


 

//fetch the leads


app.post('/webhook/zoho/leads', async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('Headers:', req.headers);
    console.log('Query Params:', req.query);
    console.log('Received webhook data:', webhookData);
    const lead = new Lead(webhookData);
    await lead.save();
    console.log('Lead saved successfully:', lead);
    res.status(200).send('Success');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});












app.post('/webhook/sendgrid', async (req, res) => {
  const accessToken = await getAccessToken();
  console.log(accessToken, "accessToken");

  try {
    // Use webhook data dynamically
    const webhookData = req.body; // The SendGrid event data
    console.log('Received SendGrid webhook data:', webhookData);   ///console the web hookdata 

    // Extract emails from the webhookData
    const emails = webhookData.map((item) => item.email.trim());       ///select the eamil a from the compnig web hook data
    const leads = await Lead.find({ Email: { $in: emails } });         ////mayching with the leads data throgh email

    // Check if any matching leads were found
    if (leads.length > 0) {
      const responseData = webhookData.map((item) => {
        const lead = leads.find(
          (lead) => lead.Email.trim() === item.email.trim()
        );
        return {
          ...item,
          Lead_Owner: lead ? lead.Lead_Owner : null,       ///finding the lead owner name
        };
      });

      console.log(responseData, "responseData");            ///console the responce data with all the details

      // Send the response to the client first (asynchronously)
      res.status(200).json({
        success: true,
        data: responseData,
      });



      ///zoho functions for to store tyhe data
      const zohoApiUrl = 'https://www.zohoapis.com/crm/v5/Solutions';

      // Process data for Zoho CRM
      for (let data of responseData) {
        const { email, sg_message_id, event, ip, sg_event_id, timestamp, category, Lead_Owner } = data;

        const zohoData = {
          data: [
            {
              Email: email,
              Event: event,
              IP: ip,
              Event_ID: sg_event_id,
              Message_ID: sg_message_id,
              Date_and_Time: new Date(timestamp * 1000).toISOString(),
              Solution_Title: category ? category.join(", ") : 'No Category',
              Title: `Solution for ${email}`,
              Lead_Owner: Lead_Owner || 'Not Assigned',
            },
          ],
        };

        try {
          // Search for existing record in Zoho CRM
          const searchZohoApiUrl = `https://www.zohoapis.com/crm/v5/Solutions/search?criteria=(Email:equals:${email})and(Message_ID:equals:${sg_message_id})`;
          const existingRecordResponse = await axios.get(searchZohoApiUrl, {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          });

          if (existingRecordResponse.data?.data?.length > 0) {
            const existingRecordId = existingRecordResponse.data.data[0].id;
            const updateApiUrl = `https://www.zohoapis.com/crm/v5/Solutions/${existingRecordId}`;
            await axios.put(updateApiUrl, zohoData, {
              headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
              },
            });

            console.log(`Record successfully updated for ${email} with Message_ID ${sg_message_id}`);
          } else {
            await axios.post(zohoApiUrl, zohoData, {
              headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
              },
            });

            console.log(`New record successfully created for ${email} with Message_ID ${sg_message_id}`);
          }
        } catch (zohoError) {
          console.error("Error updating/creating record in Zoho CRM:", zohoError.message || zohoError.response?.data || zohoError);
        }
      }
    } else {
      return res.status(404).json({
        message: "No matching leads found for the provided emails.",
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



















