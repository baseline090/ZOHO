
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


 

/////////////////---------------------------------------workiong live-----------------------------------------------------------------------//////////////////////////////////////// 
 

/////--------------fetch newly created  leads and store it on db-------------------------////


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


//////---------------------------------------------------------------------------------//////


//////------------------------ live working condition for the dynamic web hook for leads and solution tab---------------------////////////


app.post('/webhook/sendgrid', async (req, res) => {
  const accessToken = await getAccessToken();
  console.log(accessToken, "accessToken"); 

  try {
    // Use webhook data dynamically
    const webhookData = req.body; // The SendGrid event data
    console.log('Received SendGrid webhook data:', webhookData);   // console the webhook data

    // Extract emails from the webhookData
    const emails = webhookData.map((item) => item.email.trim()); // select the email from the campaign webhook data
    const leads = await Lead.find({ Email: { $in: emails } }); // matching with the leads data through email

    // Check if any matching leads were found
    if (leads.length > 0) {
      const responseData = webhookData.map((item) => {
        const lead = leads.find(
          (lead) => lead.Email.trim() === item.email.trim()
        );
        return {
          ...item,
          Lead_Owner: lead ? lead.Lead_Owner : null, // finding the lead owner name
        };
      });

      console.log(responseData, "responseData"); // console the response data with all the details

      // Send the response to the client first (asynchronously)
      res.status(200).json({
        success: true,
        data: responseData,
      });

      // Zoho functions to store the data
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

          // Step 2: Now, update the "Event" field in Zoho CRM Leads tab
          const searchLeadsApiUrl = `https://www.zohoapis.com/crm/v5/Leads/search?criteria=(Email:equals:${email})`;
          const leadRecordResponse = await axios.get(searchLeadsApiUrl, {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          });

          if (leadRecordResponse.data?.data?.length > 0) {
            const leadRecordId = leadRecordResponse.data.data[0].id;
            const updateLeadApiUrl = `https://www.zohoapis.com/crm/v5/Leads/${leadRecordId}`;
            const leadUpdateData = {
              data: [
                {
                  Event: event,  // Updating the "Event" field in Leads tab
                  I_P: ip,
                  Date_and_Time: new Date(timestamp * 1000).toISOString(),
                  Event_ID: sg_event_id,
                  Message_ID: sg_message_id,
                },
              ],
            };

            await axios.put(updateLeadApiUrl, leadUpdateData, {
              headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
              },
            });

            console.log(`Event field successfully updated for lead with Email: ${email}`);
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


///////////-----------------------------------------------------------------------------------///////////////////////////////////////////////


//////---------------controller to delite the the leads dat from the database when delite web hook trigried-----------///////////

app.post('/webhook/zoho/leads/delete', async (req, res) => {
  try {
    const webhookData = req.body; // Incoming webhook data
    console.log('Webhook Data:', webhookData);

    const email = webhookData.Email; // Extract Email
    console.log('Extracted Email:', email);

    // Case-insensitive query
    const lead = await Lead.findOneAndDelete({ Email: { $regex: new RegExp(`^${email}$`, 'i') } });

    if (lead) {
      console.log('Lead deleted successfully:', lead);
      res.status(200).send('Lead deleted successfully');
    } else {
      console.log('No lead found with the given email:', email);
      res.status(404).send('No lead found with the given email');
    }
  } catch (error) {
    console.error('Error processing delete webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});


/////////-----------------------------------------------------------------------------------------------////////////






app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



















