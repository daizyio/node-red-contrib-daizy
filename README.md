## Table of Contents
- [Introduction](#introduction)
- [Install](#install)
- [Usage](#usage)

## Introduction
The daizy events node is a way for you to integrate your iot events into your Node Red flow, once a token is added you can receive events from any of your Daizy projects.

## Install
Run this command in the root directory of your Node Red install:

`npm install node-red-contrib-daizy`

## Usage
The daizy events node works as an entry node and passes a payload object for each event received, the only configuration required is a token which can be generated via the Daizy Portal.
