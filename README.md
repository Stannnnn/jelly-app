## Jelly Music App (JMA)

A lightweight & elegant music interface for Jellyfin. Made to be intuitive and minimal with great attention to detail, a clutter-free web app centered on music playback. Using the Jellyfin API, it provides seamless access to your personal music library. [Demo](https://stannnnn.github.io/jelly-app/login?demo=1)
<br/>

<div>
  <img src="public/light-variant.webp" alt="Light variant" width="49%">
  <img src="public/dark-variant.webp" alt="Dark variant" width="49%">
</div>
<br/>

<details>
  <summary>Additional screenshots</summary>
  <br/>
  <b>Sidenav search</b>
  <p>Search for tracks, artists, albums, playlists, genres</p>
  <img src="public/search-light-variant.png" alt="Sidenav search light variant" width="49%">
  <img src="public/search-dark-variant.png" alt="Sidenav search dark variant" width="49%">
  <br/>
  <br/>
  <b>Search results</b>
  <p>View additional search results in a dedicated window</p>
  <img src="public/search-results-light-variant.webp" alt="Search results light variant" width="49%">
  <img src="public/search-results-dark-variant.webp" alt="Search results dark variant" width="49%">
  <br/>
  <br/>
  <b>Artists</b>
  <p>Features most played songs, albums, and other collaborations</p>
  <img src="public/artist-light-variant.webp" alt="Artist light variant" width="49%">
  <img src="public/artist-dark-variant.webp" alt="Artist dark variant" width="49%">
  <br/>
  <br/>
  <b>Playlists</b>
  <p>Playlist view, with it's own numbered tracklist</p>
  <img src="public/playlist-light-variant.webp" alt="Playlist light variant" width="49%">
  <img src="public/playlist-dark-variant.webp" alt="Playlist dark variant" width="49%">
</details>

### Features

-   **Elegant & Simple Design:** A clean, clutter-free interface that makes music playback effortless and enjoyable.
-   **Seamless Library Access:** Connect to your Jellyfin server to explore your personal music collection with ease.
-   **Discover Your Favorites:**
    -   **Home:** Jump back in with recently played tracks, your most-played favorites, and newly added media.
    -   **Artists:** Browse top tracks, albums, and collaborations for any artist in your library.
    -   **Playlists:** View playlists with a clear, numbered tracklist for quick navigation.
    -   **Quick Search:** Find tracks, artists, albums, playlists, or genres effortlessly with a sidenav search or dedicated results page.
-   **Device Friendly:** Enjoy a smooth, app-like experience on mobile and desktop alike, installable as a PWA for instant access.
-   **Smooth Performance:** Built with modern tools like React for a snappy, reliable experience.
-   **Smart Fetching:** Caches your music efficiently for instant, smooth playback.
-   **Personalized Settings:** Easily configure your theme and audio quality for a tailored experience.
-   **Docker Support:** Build and deploy the app with a pre-configured Jellyfin server URL for seamless self-hosting.
-   **Offline Sync:** Download individual songs, full albums, playlists, or artists for offline playback.
    -   **Auto-Sync:** Automatically downloads newly added tracks to any previously saved playlist, album, or artist.
    -   **Persistent Queue:** Downloads are managed with a local queue that resumes seamlessly across sessions.
    -   **Transcoded or Direct Streams:** Supports both original quality and transcoded downloads based on your selected bitrate.

### Installation

Jelly Music App is available as a production build, ready to deploy on an existing web server. Download the latest release from our project's [GitHub release page](https://github.com/Stannnnn/jelly-app/releases) and place the contents of the archived folder in a web-accessible directory.
<br/>
<br/>

[Yarn](https://classic.yarnpkg.com/lang/en/docs/install) (`npm i -g yarn`) is required if you wish to build the project or run the development server yourself.

#### Build from Source

1. Clone the repository:
    ```bash
    git clone https://github.com/Stannnnn/jelly-app.git
    ```
2. Install dependencies:
    ```bash
    yarn
    ```
3. Build the production files:
    ```bash
    yarn build
    ```
4. Deploy the contents of the `dist` folder to a web-accessible directory.
   <br/>

Alternatively, you can run the development server directly: `yarn dev` or `yarn dev:nocache`

### Docker Deployment

You can now deploy Jelly Music App using Docker, with the option to set a default or locked Jellyfin server URL with the .env file for simplified self-hosting.


#### 🔧 Using Docker Compose (Recommended)

The Jelly Music App image is available at:

  ```bash
  ghcr.io/Stannnnn/jelly-app:${VERSION}
  ```
You can deploy using a docker-compose.yml file like this:
  ```bash
  services:
  jelly-app:
    image: ghcr.io/Stannnnn/jelly-app:latest
    ports:
      - "80:80"
    env_file:
      - .env
    environment:
      - VITE_DEFAULT_JELLYFIN_URL=${VITE_DEFAULT_JELLYFIN_URL}
      - VITE_LOCK_JELLYFIN_URL=${VITE_LOCK_JELLYFIN_URL}
  ```
Create a .env file in the same directory to define your environment variables:
  ```dotenv
  VITE_DEFAULT_JELLYFIN_URL=https://demo.jellyfin.org/stable
  VITE_LOCK_JELLYFIN_URL=true
  ```

Examples in docker folder

  -   `VITE_DEFAULT_JELLYFIN_URL`: Sets the default Jellyfin server URL loaded on first app access if no URL is stored in Local Storage.
  -   `VITE_LOCK_JELLYFIN_URL`: If set to `true`, removes the URL input field and enforces the default URL for all connections, ideal for self-hosted instances tied to a single server.

#### 🐳 Building the Image Manually (Optional)

If you prefer to build the image manually:
  ```bash
  docker build . \
  --tag jelly-app
  ```

▶️ Running the Container
To run the app directly:
  ```bash
  docker run --rm -p 80:80 \
  -e VITE_DEFAULT_JELLYFIN_URL=${VITE_DEFAULT_JELLYFIN_URL} \
  -e VITE_LOCK_JELLYFIN_URL=${VITE_LOCK_JELLYFIN_URL} \
  jelly-app:latest

  ```

**Note**: Environment variables must be set during the Docker build process, as setting them at runtime (e.g., via -e in `docker run`) will not work.

### Contributing

We're open to pull requests, please merge them to the `develop` branch. If you have any suggestions or improvements, feel free to open an issue or submit a pull request. Your contributions are welcome and appreciated!
