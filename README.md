# clip-duplicates
CLIP duplicate detection and image search.

## Instructions
- Clone the repo: ```git clone https://github.com/jeremy-costello/clip-duplicates.git```
- Open folder: ```cd clip-duplicates```
- Rename ```.env.example``` to ```.env```
  - Can change variables in this file if needed (haven't tested anything but default)
- Run this to get the postgres host
  - ```docker network inspect bridge | grep Gateway``` (may need sudo)
  - set ```POSTGRES_HOST``` in ```.env``` to this IP
- Run docker compose: ```docker compose up``` (may need sudo)
- Place images for de-duplication or text search in the ```clip-duplicates_image-storage``` docker volume
  - Place them in a folder called ```images``` within the volume (in the ```_data``` folder)
- Open the NPM app in browser: ```localhost:PORT``` (default PORT is 3000)
- Open the menu on the left of the NPM app

## Menu Options
### Home
The home page.
### Gallery
Can browse all the images within the ```images``` folder in the ```clip-duplicates_image-storage``` docker volume
### Encode Images
Press ```Encode Images``` to encode all the images (and more) and place the results in a postgres database
### Duplicates
Prune duplicates &mdash; press ```Search``` and then ```Prune```
#### Prune settings
- Only image clusters with similarity above the ```Threshold``` value will be shown
- Can enter a string in ```Search String``` and only images with paths containing that string will be compared
#### Pruning
- Values in bold green are best; values in red are non-best
- Rename images by typing a new name in the text box and pressing ```Rename```
- Mark images for deletion by checking ```DELETE``` and pressing ```Delete Selected```
  - These images will be moved from the ```images``` folder to a ```deleted``` folder
- Restore images by checking ```RESTORE``` and pressing ```Restore Selected```
- Permanently delete images marked for deletion by pressing ```Delete Permanently```
  - This will permanently delete all images in the ```deleted``` folder
- Click ```Next Cluster``` or ```Previous Cluster``` to move between image clusters
### Text Search
Search images by text &mdash; it may take a little while for the model to load
#### Search settings
- ```Text Input``` is the text that will be encoded and compared against image encodings
- Can enter a string in ```Search String``` and only images with paths containing that string will be searched
