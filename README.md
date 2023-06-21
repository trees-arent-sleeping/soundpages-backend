# Soundpages
![image](https://github.com/trees-arent-sleeping/soundpages/assets/117592107/cf1c0b5e-7383-4d01-8249-12e4661b458e)

Soundpages is a web application that allows users to create soundboards inspired by the design aesthetics of MySpace and websites from the late 90s. Users can create soundboards and upload sounds into them, which can then be accessed and played by other users.

This project is now organized into two separate repositories, one for the frontend and the other for the backend. You can find the frontend repository [here](https://github.com/trees-arent-sleeping/soundpages) and the backend repository [here](https://github.com/trees-arent-sleeping/soundpages-backend).

## Features

- **Create Soundboards**: Users can create their own unique soundboards with a nostalgic design.
- **Upload Sounds**: Users can upload their own audio files to add to their soundboards. This allows for a diverse range of sounds to be shared and showcased.
- **View Soundboards**: Soundboards created by users can be viewed by other users. This allows for sharing and discovering different soundboards.
- **User Interactions**: Users can interact with soundboards created by others and play the uploaded sounds.
- **Keybind Functionality**: Users can assign keybinds to specific sounds on their soundboards. This enables quick and easy triggering of sounds by pressing the corresponding key on the keyboard.
- **Captioned Sounds**: Each sound can be given a title, and when that sound is played, the title is displayed at the bottom of each soundboard. This provides context and information about the played sound.

## User Stories

- As a user, I want to be able to create my own unique soundboard so that I can customize it with my favorite sounds and share it with others.
- As a user, I want to be able to view and explore soundboards created by other users so that I can discover new and interesting sounds.
- As a user, I want to be able to assign keybinds to specific sounds on my soundboard so that I can trigger them quickly and efficiently using keyboard shortcuts.
- As a user, I want to be able to add captions to each sound on my soundboard so that I can provide context and information about the played sound.
- As a user, I want to be able to edit and update my soundboard, including changing the titles, adding new sounds, or removing existing ones.
- As a user, I want to be able to securely authenticate with a user account so that I can easily access and manage my soundboards.

## Wireframe

![Soundpages Wireframe 1](https://github.com/trees-arent-sleeping/sound_pages/assets/117592107/18728f84-b1ad-4cb5-aa8c-d927a797f13b)

![Soundpages Wireframe 2](https://github.com/trees-arent-sleeping/sound_pages/assets/117592107/1cf465d5-57d8-45c0-b9d2-c05843f2cc34)

## Technologies Used

- **Front-end**: React.js for building the user interface, axios for sending HTTP requests, and react-router-dom for routing.
- **Back-end**: Node.js with Express to handle user authentication, soundboard creation, and sound uploading.
- **Database**: MongoDB Atlas to store user information, soundboard data, and sound files.

## Installation

### Backend:

1. Clone the repository: `git clone https://github.com/trees-arent-sleeping/soundpages-backend`
2. Navigate to the project directory: `cd soundpages-backend`
3. Install the dependencies: `npm install`
4. Set up the required environment variables:

   - Create a `.env` file in the root directory of the project.
   - Add the following environment variables to the `.env` file:
     ```
     MONGO_URI=<your MongoDB Atlas connection string>
     GOOGLE_CLIENT_ID=<your Google client ID>
     GOOGLE_CLIENT_SECRET=<your Google client secret>
     ```
   - Replace `<your MongoDB Atlas connection string>` with your actual MongoDB Atlas connection string.
   - Obtain your Google client ID and client secret by creating a new project on the Google Developers Console and enabling the Google OAuth API. Replace <your Google client ID> and <your Google client secret> with the corresponding values.

5. Start the development server: `npm start`

### Frontend:

1. Clone the repository: `git clone https://github.com/trees-arent-sleeping/soundpages`
2. Navigate to the project directory: `cd soundpages`
3. Install the dependencies: `npm install`
4. Install the additional dependencies:
   - React: `npm install react react-dom`
   - React Router: `npm install react-router-dom`
   - Axios: `npm install axios`
5. Start the development server: `npm start`
6. Open your web browser and visit `http://localhost:3001` to access Soundpages locally.

## Relationships

![Soundpages ERD](https://github.com/trees-arent-sleeping/sound_pages/assets/117592107/ba676616-f669-4380-b3df-3b41eae25654)

- **User and Soundboard**:
  - A user can have multiple soundboards.
  - Each soundboard belongs to a single user.
  - A one-to-many relationship.

- **Soundboard and Sound**:
  - A soundboard can have multiple sounds.
  - Each sound belongs to a single soundboard.
  - A one-to-many relationship.

## Future Features/Unsolved Problems

- Customization: In the future, users will be able to customize the appearance of their soundboards, including colors, textures, and other visual elements.
