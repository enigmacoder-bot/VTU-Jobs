const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const https = require("https");
const scheudle = require("node-schedule");

const mailjet = require("node-mailjet").apiConnect(
  process.env.JETMAIL_API_KEY,
  process.env.JETMAIL_SECRET_KEY
);

// Function to send an email
async function sendMail(subject, body) {
  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: "harshath310@gmail.com",
          Name: "SENDER_NAME",
        },
        To: [
          {
            Email: "mogaveerasumanth18@gmail.com",
            Name: "RECIPIENT_NAME",
          },
        ],
        Subject: subject,
        TextPart: body,
      },
    ],
  });

  try {
    await request;
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
function getNewJobs() {
  // URL of the website to scrape
  const url = "https://vtu.ac.in/en/category/placement/";

  // Disable SSL certificate verification
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

  // Create a custom agent with rejectUnauthorized set to false
  const agent = new https.Agent({
    rejectUnauthorized: false,
  });

  // Make a GET request to the website with certificate verification disabled
  axios
    .get(url, { httpsAgent: agent })
    .then((response) => {
      // Parse the HTML content
      const $ = cheerio.load(response.data);

      // Extract job post titles with their respective href attributes
      const jobPosts = $(".list-articles .entry-content .entry-title a");

      // File path to store the previously scraped job posts
      const previousPostsFile = "previous_job_posts.txt";

      // Read the previous job posts from the file if it exists, otherwise initialize an empty array
      let previousPosts = [];
      try {
        previousPosts = fs
          .readFileSync(previousPostsFile, "utf-8")
          .split("\n")
          .map((line) => line.trim());
      } catch (err) {
        // File doesn't exist, do nothing
      }

      // Track newly scraped job posts
      const newPosts = [];

      // Extract the text and href attributes of the anchor tags
      jobPosts.each((index, element) => {
        const text = $(element).text().trim();
        const href = $(element).attr("href");
        if (href) {
          const jobPostData = `${text},${href}`;
          if (
            !previousPosts.includes(jobPostData) &&
            !newPosts.includes(jobPostData)
          ) {
            newPosts.push(jobPostData);
          }
        }
      });

      // If there are new job posts, send an email
      if (newPosts.length > 0) {
        // Convert the job posts into a single string for the email body
        const emailBody = newPosts.join("\n\n");

        console.log("Email to Send:", emailBody);

        // Todays Date
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        // Sending Email
        const subject = `VTU Placement New Job Notification: ${formattedDate}`;
        sendMail(subject, emailBody);

        // Update the previously scraped job posts with the new ones
        previousPosts = previousPosts.concat(newPosts);

        // Write the updated job posts to the file
        fs.appendFileSync(previousPostsFile, newPosts.join("\n") + "\n");
      } else {
        console.log("No new job posts found. Skipping email sending.");
      }
    })
    .catch((error) => {
      console.error("Error occurred while scraping:", error);
    });
}

// Get job updates every week
// scheudle.scheduleJob("0 1 * * 0", getNewJobs);
scheudle.scheduleJob("* * * * *", getNewJobs);
