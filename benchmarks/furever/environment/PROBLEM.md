Your task is to upgrade the existing website to include payments functionality and theme the components to match the theme shown in the provided image.
The site needs the payments functionality listed below. You may use stripe documentation for guidance.
If you need to make server code changes, make sure to restart the server to make sure the changes take effect. The frontend will automatically reload.

YOUR TASK(S):
- Create a new tab in sidebar under Payments.
- Integrate payments using the correct Connect Embedded Component from Stripe. The payments component should not have refund capabilities and _should_ have dispute management capabilities.

GUIDANCE:
- The payments component should be able to fully load before you consider the task complete. If it's not loading after a reasonable amount of time, you should debug it and figure out why.
- Click the "create quickstart account" button at the bottom of the page to see the dashboard quickly and where you need to add the payments functionality.  You will need to scroll down to see it. DO NOT click the button that only says "quickstart". You will need to scroll down to see "create quickstart account"!! 
- Navigate _directly_ to localhost:3000/signup to see the dashboard! You DO NOT need to go to the homepage first, or ever. Go directly to the signup page at localhost:3000/signup.
- Only navigate between the signup and payments page (when you implement it). You do not need to check or show that the other navigation tabs work.