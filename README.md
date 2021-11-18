# form-management

### Overview

* An API for managing and storing registry-related form definitions. Based on
  [form.io](https://www.form.io) solution. Does not have an integrated front-end client.

### Usage

#### Run with Docker Compose

The fastest way to run this library locally is to use [Docker](https://docker.com).

* [Install Docker](https://docs.docker.com/v17.12/install)
* Download and unzip this package to a local directory on your machine.
* Open up your terminal and navigate to the unzipped folder of this library.
* Type the following in your terminal:

```bash
   npm install
   docker-compose up
```

* Go to the following URL in your browser  http://localhost:3001
* Use the following credentials to login:
    - **email**: admin@example.com
    - **password**: CHANGEME
* To change the admin password.
    - Once you login, click on the **Admin** resource
    - Click **View Data**
    - Click on the **admin@example.com** row
    - Click **Edit Submission**
    - Set the password field
    - Click **Save Submission**
    - Logout

#### Manual Installation (Node + MongoDB)

To get started you will first need the following installed on your machine.

* [Node.js](https://nodejs.org/en)
* [MongoDB](http://docs.mongodb.org/manual/installation)
    - On Mac I recommend using Homebrew `brew install mongodb-community`
    - On Windows, download and install the [MSI package](https://www.mongodb.org/downloads)
* You must then make sure you have MongoDB running by typing `mongod` in your terminal.

#### Running with Node.js

You can then download this repository, navigate to the folder in your Terminal, and then type the
following.

```bash
npm install
npm start
```

This will walk you through the installation process. When it is done, you will have a running
Form.io management application running at the following [address](http://localhost:3001) in your
browser.

### Postman collections

* `formio.postman_collection.json` - this collection contain the rest-api enpoints related to
  Form.io REST API

#### To use collection:

* Import collection to your postman;
* Set up all required environments.

### License

The form-management is now licensed under
the [OSL-v3 license](https://opensource.org/licenses/OSL-3.0), which is a copy-left OSI approved
license.