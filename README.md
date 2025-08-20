**IdeaBoard**

A collaborative whiteboard application built with React, Node.js, and MongoDB.

**Table of Contents**

* About
* Features
* Technologies
* Getting Started
  * Prerequisites
  * Installation
  * Running the application
* Authentication
* Future Enhancements
* Contributing
* License

-----

**About**

IdeaBoard is a real-time, collaborative platform where users can brainstorm, share ideas, and work together on a digital canvas. It provides a seamless experience for team collaboration and creative sessions.

**Features**

* **User Authentication**: Secure signup and login using a manual username/password and Google OAuth.
* **Collaborative Rooms** : Create private rooms for real-time idea sharing.
* **Interactive Whiteboard** : A digital canvas for adding and organizing sticky notes, drawings,and  text.
* **Real-Time Updates**: See changes from other users instantly through WebSocket connections.


**Technologies** 

**Frontend**:

* **React**: A JavaScript library for building user interfaces.
* **React Router**: For navigation and routing within the application.
* **Tailwins CSS** : A utility-first CSS framework for styling.
* **Context API** : For global state management (e.g., authentication).
* **Axios**: A promise-based HTTP client for making API requests.

**Backend**:

* **Node.js & Express**: A robust framework for the backend API.
* **MongoDB**: A NoSQL database for storing user and room data.
* **Mongoose**: An elegant MongoDB object modeling tool.
* **JWT (JSON Web Token)**: For secure, stateless authentication.
* **Bcrypt.js**: For password hashing and security.
* **Google OAuth**: For social login integration.

-----

**Getting Started**
Follow these instructions to get a copy of the project up and running on your local machine.

* **Prerequisites**
  * Node.js
  * MongoDB
  * Git

* **Installation**
1. Clone the resposistory:
git clone https://github.com/Uzrakhan/IdeaBoard
cd IdeaBoard

2. Install backend dependencies:
cd backend
npm install

3. Install frontend dependencies:
cd ../frontend
npm install

* **Running the application**
1. Set up the environment variables:
Create a .env file in the backend directory with the following variables:

PORT=5000
MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<a_long_random_string_for_jwt>
GOOGLE_CLIENT_ID=<your_google_oauth_client_id>
GOOGLE_CLIENT_SECRET=<your_google_oauth_client_secret>

2. Start the backend server:
cd backend
npm start

3. Start the frontend development server:
cd ../frontend
npm start

The application will be accessible at http://localhost:5173

-----

**Authentication**
This project supports two primary authentication methods:

1. **Manual Login** : Users can sign up and log in using a unique username and password.
2. **Google OAuth**: Users can log in quickly and securely using their Google account. The backend handles the verification and creates a user profile in the database.

-----

**Future Enhancements**
* Implement real-time collaboration features using WebSockets.
* Add different tools for the whiteboard (e.g., pen, shapes, different colors).
* Introduce a search and filter functionality for rooms.


**Contributing**
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

------

**License**
This project is licensed under the MIT License.