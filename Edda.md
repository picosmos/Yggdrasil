<!-- cspell:ignore Allfather, colour, Himinbjörg Skíðblaðnir Mímir Miðgarðr Hjemdallr Hǫrgr Bifröst -->


# First Run

To commence your journey, kindly execute the following command to build the Docker container and launch it with the default configuration:

```bash
docker compose build && docker compose up
```

Should you wish to tailor the settings to your requirements, please employ a `.env` file as follows:

```
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=password
```

The `BASIC_AUTH_*` parameters are employed for authentication within Odin, the administrative backend.

Once inside Odin, you may add users and tracks, and preview forthcoming features destined for Midgard, the front end.

# Nordic Mythology: Thematic Underpinnings

This project draws inspiration from the rich tapestry of Norse mythology, with each component named after a figure or artefact whose mythological role elegantly mirrors its technical function. The nomenclature is not mere ornamentation; rather, it is a deliberate and thoughtful mapping, imbuing the system with a sense of narrative cohesion and gravitas. The names are not only evocative, but perfectly apt for their respective purposes, as detailed below:

- **Heimdallr**  
  _The vigilant guardian between the divine and mortal realms._  
  Here, Heimdallr represents the inReach device, ever-watchful and bridging worlds.
- **Himinbjörg** (here: Himinbjorg)  
  _The resplendent abode of Heimdallr._  
  This is the communication layer interfacing with the Protegear API, standing sentinel at the threshold.
- **Skíðblaðnir** (here: Skithblathnir)  
  _Freyr's wondrous ship, crafted with such ingenuity that it may be folded and yet accommodate all the gods and their armaments._  
  This project unites the front end (Midgard), the backend (Himinbjörg), and the administrative tools (Odin), much as Skíðblaðnir unites the gods in their travels.
- **Miðgarðr** (here: Midgard)  
  _The realm of humankind, the very heart of the Norse cosmos, encircled by untamed seas and ever watched by the gods._  
  In this context, Miðgarðr is embodied by the front end — a digital landscape where mortal users may traverse the known world, consult maps, and interact with the system as denizens of Midgard once did with their own lands. It is the interface through which the human experience is both shaped and revealed.
- **Odin**  
  _The Allfather, wise, inscrutable, and ever in pursuit of knowledge, even at great personal cost._  
  Odin here presides as the administrative backend, the supreme authority orchestrating the system’s inner workings. Just as Odin governs the fates of gods and men from his high seat in Asgard, so too does this component oversee users, tracks, and the manifold secrets of the digital realm, ensuring order and wisdom prevail.
- **Mímir** (here: Mimir)  
  _The sage who guards the well of wisdom, whose counsel is sought by even the gods themselves._  
  Mímir is manifest as the database and its attendant project — a veritable wellspring of knowledge, memory, and insight. It is here that the collective wisdom of the system is stored, curated, and dispensed, much as Mímir’s well nourishes the roots of Yggdrasil and sustains the cosmos with its secrets.
- **Yggdrasil**  
  _The world tree, axis of the cosmos, whose mighty branches and roots bind together the nine worlds and sustain all existence._  
  Yggdrasil is the project in its entirety — the grand unifier, the living structure that interconnects every component, from the humblest mortal interface to the loftiest divine authority. As Yggdrasil upholds the fabric of reality in myth, so does this project provide the essential framework within which all modules coexist and flourish, each drawing strength and purpose from the whole.

When operating via Docker, the default port is 1339. Yggdrasil, the singular world tree, is depicted as having three roots, three levels, and nine worlds, in keeping with the mythic tradition.

# To Do

- User interface for adjusting settings such as colour
- Prevent map reload upon tile source change
- Script to facilitate initial setup
- Purge obsolete cache entries via `IHostedService`