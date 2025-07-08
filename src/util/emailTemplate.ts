export const generateEmailTemplate = ({
    title,
    message,
    footer = "Thank you for being a valuable part of the Mr. Amin Lawyer community. We’re here to support your growth every step of the way.",
    ctaText = "Visit Dashboard",
    ctaLink = "https://cerulean-pavlova-50e690.netlify.app/userDashboard/notificationList",
  }: {
    title: string;
    message: string;
    footer?: string;
    ctaText?: string;
    ctaLink?: string;
  }) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #f4f4f4; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h1 style="color: #4CAF50; text-align: center; font-size: 24px; margin-bottom: 24px;">${title}</h1>
  
          <p style="font-size: 16px; line-height: 1.8; color: #333;">
            ${message}
          </p>
  
          <p style="font-size: 16px; line-height: 1.8; color: #333;">
            Whether you’re preparing for your first interview or your hundredth, we’re committed to helping you build confidence, improve performance, and land your dream job. 
          </p>
  
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ctaLink}" style="background-color: #4CAF50; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              ${ctaText}
            </a>
          </div>
  
          <p style="font-size: 14px; color: #555; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
            ${footer}
          </p>
        </div>
  
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          This is an automated message from <strong>Mr. Amin Lawyer</strong>. Please do not reply directly to this email.<br />
          © ${new Date().getFullYear()} My. Amin Lawyer. All rights reserved.
        </p>
      </div>
    `;
  };
  