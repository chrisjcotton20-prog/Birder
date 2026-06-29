import { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, RefreshCw, Settings, AlertCircle, Check, X, FileText, Feather, List, Search, Square, CheckSquare, Map as MapIcon, ChevronLeft, ChevronRight, Share2, Plus, Download, ArrowLeftRight, Home, Lightbulb, MapPin, Calendar, Eye, Anchor, Moon, Award, Lock, Trophy, Globe, Sparkles, Waves, VenetianMask, Footprints } from 'lucide-react';
import { storage } from './lib/storage.js';
import { BluebirdMascot, Cardinal, Cloud, Sparkle, Compass, TreeIcon, HeartIcon, EyeIcon, CalendarIcon, ChecklistIcon, CURRENT_MASCOT } from './Illustrations.jsx';
import { geoAlbersUsa, geoAlbers, geoPath, geoContains, geoCentroid } from 'd3-geo';
import { contourDensity, contours as d3contours } from 'd3-contour';
import { feature, mesh, merge } from 'topojson-client';
import statesTopo from 'us-atlas/states-10m.json';
import NATIONAL_PARKS from './data_national_parks.json';

// ============================================================================
// THE TOTAL — derived from the ABA Checklist v8.0.7 (Jan 2021, 1,120 species)
//   filtered to:
//   • ABA Codes 1–3 only (regular & rare-but-annual; excludes vagrants like
//     Steller's Sea-Eagle which are Codes 4–5, and extinct/extirpated Code 6)
//   • Native species only (excludes the 52 established exotics on ABA's
//     Introduced Species list — House Sparrow, Starling, Rock Pigeon, Hawaiian
//     introductions, etc. Species native to mainland US that have introduced
//     populations elsewhere — Mallard, Wild Turkey — are kept.)
//
//   Sources:
//     https://www.aba.org/aba-checklist/
//     https://www.aba.org/aba-area-introduced-species/
// ============================================================================

// 774 native, regularly-occurring species in ABA taxonomic order: [common, sci]
const NATIVE_SPECIES = [
  ["Black-bellied Whistling-Duck","Dendrocygna autumnalis"],
  ["Fulvous Whistling-Duck","Dendrocygna bicolor"],
  ["Emperor Goose","Anser canagicus"],
  ["Snow Goose","Anser caerulescens"],
  ["Ross's Goose","Anser rossii"],
  ["Greater White-fronted Goose","Anser albifrons"],
  ["Taiga Bean-Goose","Anser fabalis"],
  ["Tundra Bean-Goose","Anser serrirostris"],
  ["Brant","Branta bernicla"],
  ["Cackling Goose","Branta hutchinsii"],
  ["Canada Goose","Branta canadensis"],
  ["Hawaiian Goose","Branta sandvicensis"],
  ["Trumpeter Swan","Cygnus buccinator"],
  ["Tundra Swan","Cygnus columbianus"],
  ["Whooper Swan","Cygnus cygnus"],
  ["Muscovy Duck","Cairina moschata"],
  ["Wood Duck","Aix sponsa"],
  ["Blue-winged Teal","Spatula discors"],
  ["Cinnamon Teal","Spatula cyanoptera"],
  ["Northern Shoveler","Spatula clypeata"],
  ["Gadwall","Mareca strepera"],
  ["Eurasian Wigeon","Mareca penelope"],
  ["American Wigeon","Mareca americana"],
  ["Laysan Duck","Anas laysanensis"],
  ["Hawaiian Duck","Anas wyvilliana"],
  ["Mallard","Anas platyrhynchos"],
  ["Mexican Duck","Anas diazi"],
  ["American Black Duck","Anas rubripes"],
  ["Mottled Duck","Anas fulvigula"],
  ["Northern Pintail","Anas acuta"],
  ["Green-winged Teal","Anas crecca"],
  ["Canvasback","Aythya valisineria"],
  ["Redhead","Aythya americana"],
  ["Common Pochard","Aythya ferina"],
  ["Ring-necked Duck","Aythya collaris"],
  ["Tufted Duck","Aythya fuligula"],
  ["Greater Scaup","Aythya marila"],
  ["Lesser Scaup","Aythya affinis"],
  ["Steller's Eider","Polysticta stelleri"],
  ["Spectacled Eider","Somateria fischeri"],
  ["King Eider","Somateria spectabilis"],
  ["Common Eider","Somateria mollissima"],
  ["Harlequin Duck","Histrionicus histrionicus"],
  ["Surf Scoter","Melanitta perspicillata"],
  ["White-winged Scoter","Melanitta deglandi"],
  ["Black Scoter","Melanitta americana"],
  ["Long-tailed Duck","Clangula hyemalis"],
  ["Bufflehead","Bucephala albeola"],
  ["Common Goldeneye","Bucephala clangula"],
  ["Barrow's Goldeneye","Bucephala islandica"],
  ["Smew","Mergellus albellus"],
  ["Hooded Merganser","Lophodytes cucullatus"],
  ["Common Merganser","Mergus merganser"],
  ["Red-breasted Merganser","Mergus serrator"],
  ["Masked Duck","Nomonyx dominicus"],
  ["Ruddy Duck","Oxyura jamaicensis"],
  ["Plain Chachalaca","Ortalis vetula"],
  ["Mountain Quail","Oreortyx pictus"],
  ["Northern Bobwhite","Colinus virginianus"],
  ["Scaled Quail","Callipepla squamata"],
  ["California Quail","Callipepla californica"],
  ["Gambel's Quail","Callipepla gambelii"],
  ["Montezuma Quail","Cyrtonyx montezumae"],
  ["Wild Turkey","Meleagris gallopavo"],
  ["Ruffed Grouse","Bonasa umbellus"],
  ["Spruce Grouse","Falcipennis canadensis"],
  ["Willow Ptarmigan","Lagopus lagopus"],
  ["Rock Ptarmigan","Lagopus muta"],
  ["White-tailed Ptarmigan","Lagopus leucura"],
  ["Greater Sage-Grouse","Centrocercus urophasianus"],
  ["Gunnison Sage-Grouse","Centrocercus minimus"],
  ["Dusky Grouse","Dendragapus obscurus"],
  ["Sooty Grouse","Dendragapus fuliginosus"],
  ["Sharp-tailed Grouse","Tympanuchus phasianellus"],
  ["Greater Prairie-Chicken","Tympanuchus cupido"],
  ["Lesser Prairie-Chicken","Tympanuchus pallidicinctus"],
  ["American Flamingo","Phoenicopterus ruber"],
  ["Least Grebe","Tachybaptus dominicus"],
  ["Pied-billed Grebe","Podilymbus podiceps"],
  ["Horned Grebe","Podiceps auritus"],
  ["Red-necked Grebe","Podiceps grisegena"],
  ["Eared Grebe","Podiceps nigricollis"],
  ["Western Grebe","Aechmophorus occidentalis"],
  ["Clark's Grebe","Aechmophorus clarkii"],
  ["White-crowned Pigeon","Patagioenas leucocephala"],
  ["Red-billed Pigeon","Patagioenas flavirostris"],
  ["Band-tailed Pigeon","Patagioenas fasciata"],
  ["Inca Dove","Columbina inca"],
  ["Common Ground Dove","Columbina passerina"],
  ["Ruddy Ground Dove","Columbina talpacoti"],
  ["White-tipped Dove","Leptotila verreauxi"],
  ["White-winged Dove","Zenaida asiatica"],
  ["Mourning Dove","Zenaida macroura"],
  ["Smooth-billed Ani","Crotophaga ani"],
  ["Groove-billed Ani","Crotophaga sulcirostris"],
  ["Greater Roadrunner","Geococcyx californianus"],
  ["Common Cuckoo","Cuculus canorus"],
  ["Yellow-billed Cuckoo","Coccyzus americanus"],
  ["Mangrove Cuckoo","Coccyzus minor"],
  ["Black-billed Cuckoo","Coccyzus erythropthalmus"],
  ["Lesser Nighthawk","Chordeiles acutipennis"],
  ["Common Nighthawk","Chordeiles minor"],
  ["Antillean Nighthawk","Chordeiles gundlachii"],
  ["Common Pauraque","Nyctidromus albicollis"],
  ["Common Poorwill","Phalaenoptilus nuttallii"],
  ["Chuck-will's-widow","Antrostomus carolinensis"],
  ["Buff-collared Nightjar","Antrostomus ridgwayi"],
  ["Eastern Whip-poor-will","Antrostomus vociferus"],
  ["Mexican Whip-poor-will","Antrostomus arizonae"],
  ["Black Swift","Cypseloides niger"],
  ["Chimney Swift","Chaetura pelagica"],
  ["Vaux's Swift","Chaetura vauxi"],
  ["Mariana Swiftlet","Aerodramus bartschi"],
  ["White-throated Swift","Aeronautes saxatalis"],
  ["Mexican Violetear","Colibri thalassinus"],
  ["Rivoli's Hummingbird","Eugenes fulgens"],
  ["Blue-throated Mountain-gem","Lampornis clemenciae"],
  ["Lucifer Hummingbird","Calothorax lucifer"],
  ["Ruby-throated Hummingbird","Archilochus colubris"],
  ["Black-chinned Hummingbird","Archilochus alexandri"],
  ["Anna's Hummingbird","Calypte anna"],
  ["Costa's Hummingbird","Calypte costae"],
  ["Calliope Hummingbird","Selasphorus calliope"],
  ["Rufous Hummingbird","Selasphorus rufus"],
  ["Allen's Hummingbird","Selasphorus sasin"],
  ["Broad-tailed Hummingbird","Selasphorus platycercus"],
  ["Broad-billed Hummingbird","Cynanthus latirostris"],
  ["White-eared Hummingbird","Basilinna leucotis"],
  ["Violet-crowned Hummingbird","Leucolia violiceps"],
  ["Berylline Hummingbird","Saucerottia beryllina"],
  ["Buff-bellied Hummingbird","Amazilia yucatanensis"],
  ["Ridgway's Rail","Rallus obsoletus"],
  ["Clapper Rail","Rallus crepitans"],
  ["King Rail","Rallus elegans"],
  ["Virginia Rail","Rallus limicola"],
  ["Sora","Porzana carolina"],
  ["Common Gallinule","Gallinula galeata"],
  ["Hawaiian Coot","Fulica alai"],
  ["American Coot","Fulica americana"],
  ["Purple Gallinule","Porphyrio martinicus"],
  ["Yellow Rail","Coturnicops noveboracensis"],
  ["Black Rail","Laterallus jamaicensis"],
  ["Limpkin","Aramus guarauna"],
  ["Sandhill Crane","Antigone canadensis"],
  ["Whooping Crane","Grus americana"],
  ["Black-necked Stilt","Himantopus mexicanus"],
  ["American Avocet","Recurvirostra americana"],
  ["American Oystercatcher","Haematopus palliatus"],
  ["Black Oystercatcher","Haematopus bachmani"],
  ["Black-bellied Plover","Pluvialis squatarola"],
  ["American Golden-Plover","Pluvialis dominica"],
  ["Pacific Golden-Plover","Pluvialis fulva"],
  ["Killdeer","Charadrius vociferus"],
  ["Common Ringed Plover","Charadrius hiaticula"],
  ["Semipalmated Plover","Charadrius semipalmatus"],
  ["Piping Plover","Charadrius melodus"],
  ["Lesser Sand-Plover","Anarhynchus mongolus"],
  ["Wilson's Plover","Anarhynchus wilsonia"],
  ["Mountain Plover","Anarhynchus montanus"],
  ["Snowy Plover","Anarhynchus nivosus"],
  ["Upland Sandpiper","Bartramia longicauda"],
  ["Bristle-thighed Curlew","Numenius tahitiensis"],
  ["Whimbrel","Numenius phaeopus"],
  ["Long-billed Curlew","Numenius americanus"],
  ["Bar-tailed Godwit","Limosa lapponica"],
  ["Black-tailed Godwit","Limosa limosa"],
  ["Hudsonian Godwit","Limosa haemastica"],
  ["Marbled Godwit","Limosa fedoa"],
  ["Ruddy Turnstone","Arenaria interpres"],
  ["Black Turnstone","Arenaria melanocephala"],
  ["Red Knot","Calidris canutus"],
  ["Surfbird","Calidris virgata"],
  ["Ruff","Calidris pugnax"],
  ["Sharp-tailed Sandpiper","Calidris acuminata"],
  ["Stilt Sandpiper","Calidris himantopus"],
  ["Curlew Sandpiper","Calidris ferruginea"],
  ["Temminck's Stint","Calidris temminckii"],
  ["Long-toed Stint","Calidris subminuta"],
  ["Red-necked Stint","Calidris ruficollis"],
  ["Sanderling","Calidris alba"],
  ["Dunlin","Calidris alpina"],
  ["Rock Sandpiper","Calidris ptilocnemis"],
  ["Purple Sandpiper","Calidris maritima"],
  ["Baird's Sandpiper","Calidris bairdii"],
  ["Least Sandpiper","Calidris minutilla"],
  ["White-rumped Sandpiper","Calidris fuscicollis"],
  ["Buff-breasted Sandpiper","Calidris subruficollis"],
  ["Pectoral Sandpiper","Calidris melanotos"],
  ["Semipalmated Sandpiper","Calidris pusilla"],
  ["Western Sandpiper","Calidris mauri"],
  ["Short-billed Dowitcher","Limnodromus griseus"],
  ["Long-billed Dowitcher","Limnodromus scolopaceus"],
  ["American Woodcock","Scolopax minor"],
  ["Common Snipe","Gallinago gallinago"],
  ["Wilson's Snipe","Gallinago delicata"],
  ["Terek Sandpiper","Xenus cinereus"],
  ["Common Sandpiper","Actitis hypoleucos"],
  ["Spotted Sandpiper","Actitis macularius"],
  ["Solitary Sandpiper","Tringa solitaria"],
  ["Gray-tailed Tattler","Tringa brevipes"],
  ["Wandering Tattler","Tringa incana"],
  ["Lesser Yellowlegs","Tringa flavipes"],
  ["Willet","Tringa semipalmata"],
  ["Common Greenshank","Tringa nebularia"],
  ["Greater Yellowlegs","Tringa melanoleuca"],
  ["Wood Sandpiper","Tringa glareola"],
  ["Wilson's Phalarope","Phalaropus tricolor"],
  ["Red-necked Phalarope","Phalaropus lobatus"],
  ["Red Phalarope","Phalaropus fulicarius"],
  ["Great Skua","Stercorarius skua"],
  ["South Polar Skua","Stercorarius maccormicki"],
  ["Pomarine Jaeger","Stercorarius pomarinus"],
  ["Parasitic Jaeger","Stercorarius parasiticus"],
  ["Long-tailed Jaeger","Stercorarius longicaudus"],
  ["Dovekie","Alle alle"],
  ["Common Murre","Uria aalge"],
  ["Thick-billed Murre","Uria lomvia"],
  ["Razorbill","Alca torda"],
  ["Black Guillemot","Cepphus grylle"],
  ["Pigeon Guillemot","Cepphus columba"],
  ["Long-billed Murrelet","Brachyramphus perdix"],
  ["Marbled Murrelet","Brachyramphus marmoratus"],
  ["Kittlitz's Murrelet","Brachyramphus brevirostris"],
  ["Scripps's Murrelet","Synthliboramphus scrippsi"],
  ["Guadalupe Murrelet","Synthliboramphus hypoleucus"],
  ["Craveri's Murrelet","Synthliboramphus craveri"],
  ["Ancient Murrelet","Synthliboramphus antiquus"],
  ["Cassin's Auklet","Ptychoramphus aleuticus"],
  ["Parakeet Auklet","Aethia psittacula"],
  ["Least Auklet","Aethia pusilla"],
  ["Whiskered Auklet","Aethia pygmaea"],
  ["Crested Auklet","Aethia cristatella"],
  ["Rhinoceros Auklet","Cerorhinca monocerata"],
  ["Atlantic Puffin","Fratercula arctica"],
  ["Horned Puffin","Fratercula corniculata"],
  ["Tufted Puffin","Fratercula cirrhata"],
  ["Black-legged Kittiwake","Rissa tridactyla"],
  ["Red-legged Kittiwake","Rissa brevirostris"],
  ["Ivory Gull","Pagophila eburnea"],
  ["Sabine's Gull","Xema sabini"],
  ["Bonaparte's Gull","Chroicocephalus philadelphia"],
  ["Black-headed Gull","Chroicocephalus ridibundus"],
  ["Little Gull","Hydrocoloeus minutus"],
  ["Ross's Gull","Rhodostethia rosea"],
  ["Laughing Gull","Leucophaeus atricilla"],
  ["Franklin's Gull","Leucophaeus pipixcan"],
  ["Heermann's Gull","Larus heermanni"],
  ["Short-billed Gull","Larus brachyrhynchus"],
  ["Ring-billed Gull","Larus delawarensis"],
  ["Western Gull","Larus occidentalis"],
  ["Yellow-footed Gull","Larus livens"],
  ["California Gull","Larus californicus"],
  ["Herring Gull","Larus argentatus"],
  ["Iceland Gull","Larus glaucoides"],
  ["Lesser Black-backed Gull","Larus fuscus"],
  ["Slaty-backed Gull","Larus schistisagus"],
  ["Glaucous-winged Gull","Larus glaucescens"],
  ["Glaucous Gull","Larus hyperboreus"],
  ["Great Black-backed Gull","Larus marinus"],
  ["Brown Noddy","Anous stolidus"],
  ["Black Noddy","Anous minutus"],
  ["Blue-gray Noddy","Anous ceruleus"],
  ["White Tern","Gygis alba"],
  ["Sooty Tern","Onychoprion fuscatus"],
  ["Gray-backed Tern","Onychoprion lunatus"],
  ["Bridled Tern","Onychoprion anaethetus"],
  ["Aleutian Tern","Onychoprion aleuticus"],
  ["Least Tern","Sternula antillarum"],
  ["Gull-billed Tern","Gelochelidon nilotica"],
  ["Caspian Tern","Hydroprogne caspia"],
  ["Black Tern","Chlidonias niger"],
  ["Roseate Tern","Sterna dougallii"],
  ["Common Tern","Sterna hirundo"],
  ["Arctic Tern","Sterna paradisaea"],
  ["Forster's Tern","Sterna forsteri"],
  ["Royal Tern","Thalasseus maximus"],
  ["Sandwich Tern","Thalasseus sandvicensis"],
  ["Elegant Tern","Thalasseus elegans"],
  ["Black Skimmer","Rynchops niger"],
  ["White-tailed Tropicbird","Phaethon lepturus"],
  ["Red-billed Tropicbird","Phaethon aethereus"],
  ["Red-tailed Tropicbird","Phaethon rubricauda"],
  ["Red-throated Loon","Gavia stellata"],
  ["Arctic Loon","Gavia arctica"],
  ["Pacific Loon","Gavia pacifica"],
  ["Common Loon","Gavia immer"],
  ["Yellow-billed Loon","Gavia adamsii"],
  ["Laysan Albatross","Phoebastria immutabilis"],
  ["Black-footed Albatross","Phoebastria nigripes"],
  ["Short-tailed Albatross","Phoebastria albatrus"],
  ["Wilson's Storm-Petrel","Oceanites oceanicus"],
  ["White-faced Storm-Petrel","Pelagodroma marina"],
  ["Fork-tailed Storm-Petrel","Hydrobates furcatus"],
  ["Leach's Storm-Petrel","Hydrobates leucorhous"],
  ["Townsend's Storm-Petrel","Hydrobates socorroensis"],
  ["Ashy Storm-Petrel","Hydrobates homochroa"],
  ["Band-rumped Storm-Petrel","Hydrobates castro"],
  ["Black Storm-Petrel","Hydrobates melania"],
  ["Tristram's Storm-Petrel","Hydrobates tristrami"],
  ["Least Storm-Petrel","Hydrobates microsoma"],
  ["Northern Fulmar","Fulmarus glacialis"],
  ["Trindade Petrel","Pterodroma arminjoniana"],
  ["Murphy's Petrel","Pterodroma ultima"],
  ["Mottled Petrel","Pterodroma inexpectata"],
  ["Bermuda Petrel","Pterodroma cahow"],
  ["Black-capped Petrel","Pterodroma hasitata"],
  ["Juan Fernandez Petrel","Pterodroma externa"],
  ["Hawaiian Petrel","Pterodroma sandwichensis"],
  ["White-necked Petrel","Pterodroma cervicalis"],
  ["Bonin Petrel","Pterodroma hypoleuca"],
  ["Black-winged Petrel","Pterodroma nigripennis"],
  ["Fea's Petrel","Pterodroma feae"],
  ["Cook's Petrel","Pterodroma cookii"],
  ["Bulwer's Petrel","Bulweria bulwerii"],
  ["Cory's Shearwater","Calonectris diomedea"],
  ["Wedge-tailed Shearwater","Ardenna pacifica"],
  ["Buller's Shearwater","Ardenna bulleri"],
  ["Short-tailed Shearwater","Ardenna tenuirostris"],
  ["Sooty Shearwater","Ardenna grisea"],
  ["Great Shearwater","Ardenna gravis"],
  ["Pink-footed Shearwater","Ardenna creatopus"],
  ["Flesh-footed Shearwater","Ardenna carneipes"],
  ["Christmas Shearwater","Puffinus nativitatis"],
  ["Manx Shearwater","Puffinus puffinus"],
  ["Newell's Shearwater","Puffinus newelli"],
  ["Black-vented Shearwater","Puffinus opisthomelas"],
  ["Audubon's Shearwater","Puffinus lherminieri"],
  ["Wood Stork","Mycteria americana"],
  ["Magnificent Frigatebird","Fregata magnificens"],
  ["Great Frigatebird","Fregata minor"],
  ["Masked Booby","Sula dactylatra"],
  ["Brown Booby","Sula leucogaster"],
  ["Red-footed Booby","Sula sula"],
  ["Northern Gannet","Morus bassanus"],
  ["Anhinga","Anhinga anhinga"],
  ["Brandt's Cormorant","Urile penicillatus"],
  ["Red-faced Cormorant","Urile urile"],
  ["Pelagic Cormorant","Urile pelagicus"],
  ["Great Cormorant","Phalacrocorax carbo"],
  ["Double-crested Cormorant","Nannopterum auritum"],
  ["Neotropic Cormorant","Nannopterum brasilianum"],
  ["American White Pelican","Pelecanus erythrorhynchos"],
  ["Brown Pelican","Pelecanus occidentalis"],
  ["American Bittern","Botaurus lentiginosus"],
  ["Least Bittern","Ixobrychus exilis"],
  ["Great Blue Heron","Ardea herodias"],
  ["Great Egret","Ardea alba"],
  ["Snowy Egret","Egretta thula"],
  ["Little Blue Heron","Egretta caerulea"],
  ["Tricolored Heron","Egretta tricolor"],
  ["Reddish Egret","Egretta rufescens"],
  ["Cattle Egret","Bubulcus ibis"],
  ["Green Heron","Butorides virescens"],
  ["Black-crowned Night-Heron","Nycticorax nycticorax"],
  ["Yellow-crowned Night-Heron","Nyctanassa violacea"],
  ["White Ibis","Eudocimus albus"],
  ["Glossy Ibis","Plegadis falcinellus"],
  ["White-faced Ibis","Plegadis chihi"],
  ["Roseate Spoonbill","Platalea ajaja"],
  ["California Condor","Gymnogyps californianus"],
  ["Black Vulture","Coragyps atratus"],
  ["Turkey Vulture","Cathartes aura"],
  ["Osprey","Pandion haliaetus"],
  ["White-tailed Kite","Elanus leucurus"],
  ["Hook-billed Kite","Chondrohierax uncinatus"],
  ["Swallow-tailed Kite","Elanoides forficatus"],
  ["Golden Eagle","Aquila chrysaetos"],
  ["Northern Harrier","Circus hudsonius"],
  ["Sharp-shinned Hawk","Accipiter striatus"],
  ["Cooper's Hawk","Astur cooperii"],
  ["American Goshawk","Astur atricapillus"],
  ["Bald Eagle","Haliaeetus leucocephalus"],
  ["Mississippi Kite","Ictinia mississippiensis"],
  ["Snail Kite","Rostrhamus sociabilis"],
  ["Common Black Hawk","Buteogallus anthracinus"],
  ["Harris's Hawk","Parabuteo unicinctus"],
  ["White-tailed Hawk","Geranoaetus albicaudatus"],
  ["Gray Hawk","Buteo plagiatus"],
  ["Red-shouldered Hawk","Buteo lineatus"],
  ["Broad-winged Hawk","Buteo platypterus"],
  ["Hawaiian Hawk","Buteo solitarius"],
  ["Short-tailed Hawk","Buteo brachyurus"],
  ["Swainson's Hawk","Buteo swainsoni"],
  ["Zone-tailed Hawk","Buteo albonotatus"],
  ["Red-tailed Hawk","Buteo jamaicensis"],
  ["Rough-legged Hawk","Buteo lagopus"],
  ["Ferruginous Hawk","Buteo regalis"],
  ["Barn Owl","Tyto alba"],
  ["Flammulated Owl","Psiloscops flammeolus"],
  ["Whiskered Screech-Owl","Megascops trichopsis"],
  ["Western Screech-Owl","Megascops kennicottii"],
  ["Eastern Screech-Owl","Megascops asio"],
  ["Great Horned Owl","Bubo virginianus"],
  ["Snowy Owl","Bubo scandiacus"],
  ["Northern Hawk Owl","Surnia ulula"],
  ["Northern Pygmy-Owl","Glaucidium gnoma"],
  ["Ferruginous Pygmy-Owl","Glaucidium brasilianum"],
  ["Elf Owl","Micrathene whitneyi"],
  ["Burrowing Owl","Athene cunicularia"],
  ["Spotted Owl","Strix occidentalis"],
  ["Barred Owl","Strix varia"],
  ["Great Gray Owl","Strix nebulosa"],
  ["Long-eared Owl","Asio otus"],
  ["Short-eared Owl","Asio flammeus"],
  ["Boreal Owl","Aegolius funereus"],
  ["Northern Saw-whet Owl","Aegolius acadicus"],
  ["Elegant Trogon","Trogon elegans"],
  ["Ringed Kingfisher","Megaceryle torquata"],
  ["Belted Kingfisher","Megaceryle alcyon"],
  ["Green Kingfisher","Chloroceryle americana"],
  ["Lewis's Woodpecker","Melanerpes lewis"],
  ["Red-headed Woodpecker","Melanerpes erythrocephalus"],
  ["Acorn Woodpecker","Melanerpes formicivorus"],
  ["Gila Woodpecker","Melanerpes uropygialis"],
  ["Golden-fronted Woodpecker","Melanerpes aurifrons"],
  ["Red-bellied Woodpecker","Melanerpes carolinus"],
  ["Williamson's Sapsucker","Sphyrapicus thyroideus"],
  ["Yellow-bellied Sapsucker","Sphyrapicus varius"],
  ["Red-naped Sapsucker","Sphyrapicus nuchalis"],
  ["Red-breasted Sapsucker","Sphyrapicus ruber"],
  ["American Three-toed Woodpecker","Picoides dorsalis"],
  ["Black-backed Woodpecker","Picoides arcticus"],
  ["Downy Woodpecker","Dryobates pubescens"],
  ["Nuttall's Woodpecker","Dryobates nuttallii"],
  ["Ladder-backed Woodpecker","Dryobates scalaris"],
  ["Red-cockaded Woodpecker","Dryobates borealis"],
  ["Hairy Woodpecker","Dryobates villosus"],
  ["White-headed Woodpecker","Dryobates albolarvatus"],
  ["Arizona Woodpecker","Dryobates arizonae"],
  ["Northern Flicker","Colaptes auratus"],
  ["Gilded Flicker","Colaptes chrysoides"],
  ["Pileated Woodpecker","Dryocopus pileatus"],
  ["Crested Caracara","Caracara cheriway"],
  ["American Kestrel","Falco sparverius"],
  ["Merlin","Falco columbarius"],
  ["Aplomado Falcon","Falco femoralis"],
  ["Gyrfalcon","Falco rusticolus"],
  ["Peregrine Falcon","Falco peregrinus"],
  ["Prairie Falcon","Falco mexicanus"],
  ["Rose-throated Becard","Pachyramphus aglaiae"],
  ["Northern Beardless-Tyrannulet","Camptostoma imberbe"],
  ["Dusky-capped Flycatcher","Myiarchus tuberculifer"],
  ["Ash-throated Flycatcher","Myiarchus cinerascens"],
  ["Great Crested Flycatcher","Myiarchus crinitus"],
  ["Brown-crested Flycatcher","Myiarchus tyrannulus"],
  ["La Sagra's Flycatcher","Myiarchus sagrae"],
  ["Great Kiskadee","Pitangus sulphuratus"],
  ["Sulphur-bellied Flycatcher","Myiodynastes luteiventris"],
  ["Tropical Kingbird","Tyrannus melancholicus"],
  ["Couch's Kingbird","Tyrannus couchii"],
  ["Cassin's Kingbird","Tyrannus vociferans"],
  ["Thick-billed Kingbird","Tyrannus crassirostris"],
  ["Western Kingbird","Tyrannus verticalis"],
  ["Eastern Kingbird","Tyrannus tyrannus"],
  ["Gray Kingbird","Tyrannus dominicensis"],
  ["Scissor-tailed Flycatcher","Tyrannus forficatus"],
  ["Fork-tailed Flycatcher","Tyrannus savana"],
  ["Olive-sided Flycatcher","Contopus cooperi"],
  ["Greater Pewee","Contopus pertinax"],
  ["Western Wood-Pewee","Contopus sordidulus"],
  ["Eastern Wood-Pewee","Contopus virens"],
  ["Yellow-bellied Flycatcher","Empidonax flaviventris"],
  ["Acadian Flycatcher","Empidonax virescens"],
  ["Alder Flycatcher","Empidonax alnorum"],
  ["Willow Flycatcher","Empidonax traillii"],
  ["Least Flycatcher","Empidonax minimus"],
  ["Hammond's Flycatcher","Empidonax hammondii"],
  ["Gray Flycatcher","Empidonax wrightii"],
  ["Dusky Flycatcher","Empidonax oberholseri"],
  ["Pacific-slope Flycatcher","Empidonax difficilis"],
  ["Cordilleran Flycatcher","Empidonax occidentalis"],
  ["Buff-breasted Flycatcher","Empidonax fulvifrons"],
  ["Black Phoebe","Sayornis nigricans"],
  ["Eastern Phoebe","Sayornis phoebe"],
  ["Say's Phoebe","Sayornis saya"],
  ["Vermilion Flycatcher","Pyrocephalus rubinus"],
  ["Loggerhead Shrike","Lanius ludovicianus"],
  ["Northern Shrike","Lanius borealis"],
  ["Black-capped Vireo","Vireo atricapilla"],
  ["White-eyed Vireo","Vireo griseus"],
  ["Bell's Vireo","Vireo bellii"],
  ["Gray Vireo","Vireo vicinior"],
  ["Hutton's Vireo","Vireo huttoni"],
  ["Yellow-throated Vireo","Vireo flavifrons"],
  ["Cassin's Vireo","Vireo cassinii"],
  ["Blue-headed Vireo","Vireo solitarius"],
  ["Plumbeous Vireo","Vireo plumbeus"],
  ["Philadelphia Vireo","Vireo philadelphicus"],
  ["Warbling Vireo","Vireo gilvus"],
  ["Red-eyed Vireo","Vireo olivaceus"],
  ["Yellow-green Vireo","Vireo flavoviridis"],
  ["Black-whiskered Vireo","Vireo altiloquus"],
  ["Canada Jay","Perisoreus canadensis"],
  ["Green Jay","Cyanocorax yncas"],
  ["Pinyon Jay","Gymnorhinus cyanocephalus"],
  ["Steller's Jay","Cyanocitta stelleri"],
  ["Blue Jay","Cyanocitta cristata"],
  ["Florida Scrub-Jay","Aphelocoma coerulescens"],
  ["Island Scrub-Jay","Aphelocoma insularis"],
  ["California Scrub-Jay","Aphelocoma californica"],
  ["Woodhouse's Scrub-Jay","Aphelocoma woodhouseii"],
  ["Mexican Jay","Aphelocoma wollweberi"],
  ["Clark's Nutcracker","Nucifraga columbiana"],
  ["Black-billed Magpie","Pica hudsonia"],
  ["Yellow-billed Magpie","Pica nuttalli"],
  ["American Crow","Corvus brachyrhynchos"],
  ["Fish Crow","Corvus ossifragus"],
  ["Chihuahuan Raven","Corvus cryptoleucus"],
  ["Common Raven","Corvus corax"],
  ["Kauai Elepaio","Chasiempis sclateri"],
  ["Oahu Elepaio","Chasiempis ibidis"],
  ["Hawaii Elepaio","Chasiempis sandwichensis"],
  ["Horned Lark","Eremophila alpestris"],
  ["Bank Swallow","Riparia riparia"],
  ["Tree Swallow","Tachycineta bicolor"],
  ["Violet-green Swallow","Tachycineta thalassina"],
  ["Northern Rough-winged Swallow","Stelgidopteryx serripennis"],
  ["Purple Martin","Progne subis"],
  ["Barn Swallow","Hirundo rustica"],
  ["Cliff Swallow","Petrochelidon pyrrhonota"],
  ["Cave Swallow","Petrochelidon fulva"],
  ["Carolina Chickadee","Poecile carolinensis"],
  ["Black-capped Chickadee","Poecile atricapillus"],
  ["Mountain Chickadee","Poecile gambeli"],
  ["Mexican Chickadee","Poecile sclateri"],
  ["Chestnut-backed Chickadee","Poecile rufescens"],
  ["Boreal Chickadee","Poecile hudsonicus"],
  ["Gray-headed Chickadee","Poecile cinctus"],
  ["Bridled Titmouse","Baeolophus wollweberi"],
  ["Oak Titmouse","Baeolophus inornatus"],
  ["Juniper Titmouse","Baeolophus ridgwayi"],
  ["Tufted Titmouse","Baeolophus bicolor"],
  ["Black-crested Titmouse","Baeolophus atricristatus"],
  ["Verdin","Auriparus flaviceps"],
  ["Bushtit","Psaltriparus minimus"],
  ["Red-breasted Nuthatch","Sitta canadensis"],
  ["White-breasted Nuthatch","Sitta carolinensis"],
  ["Pygmy Nuthatch","Sitta pygmaea"],
  ["Brown-headed Nuthatch","Sitta pusilla"],
  ["Brown Creeper","Certhia americana"],
  ["Rock Wren","Salpinctes obsoletus"],
  ["Canyon Wren","Catherpes mexicanus"],
  ["House Wren","Troglodytes aedon"],
  ["Pacific Wren","Troglodytes pacificus"],
  ["Winter Wren","Troglodytes hiemalis"],
  ["Sedge Wren","Cistothorus platensis"],
  ["Marsh Wren","Cistothorus palustris"],
  ["Carolina Wren","Thryothorus ludovicianus"],
  ["Bewick's Wren","Thryomanes bewickii"],
  ["Cactus Wren","Campylorhynchus brunneicapillus"],
  ["Blue-gray Gnatcatcher","Polioptila caerulea"],
  ["California Gnatcatcher","Polioptila californica"],
  ["Black-tailed Gnatcatcher","Polioptila melanura"],
  ["Black-capped Gnatcatcher","Polioptila nigriceps"],
  ["American Dipper","Cinclus mexicanus"],
  ["Golden-crowned Kinglet","Regulus satrapa"],
  ["Ruby-crowned Kinglet","Corthylio calendula"],
  ["Arctic Warbler","Phylloscopus borealis"],
  ["Wrentit","Chamaea fasciata"],
  ["Millerbird","Acrocephalus familiaris"],
  ["Bluethroat","Cyanecula svecica"],
  ["Siberian Rubythroat","Calliope calliope"],
  ["Northern Wheatear","Oenanthe oenanthe"],
  ["Eastern Bluebird","Sialia sialis"],
  ["Western Bluebird","Sialia mexicana"],
  ["Mountain Bluebird","Sialia currucoides"],
  ["Townsend's Solitaire","Myadestes townsendi"],
  ["Omao","Myadestes obscurus"],
  ["Puaiohi","Myadestes palmeri"],
  ["Veery","Catharus fuscescens"],
  ["Gray-cheeked Thrush","Catharus minimus"],
  ["Bicknell's Thrush","Catharus bicknelli"],
  ["Swainson's Thrush","Catharus ustulatus"],
  ["Hermit Thrush","Catharus guttatus"],
  ["Wood Thrush","Hylocichla mustelina"],
  ["Eyebrowed Thrush","Turdus obscurus"],
  ["Clay-colored Thrush","Turdus grayi"],
  ["Rufous-backed Robin","Turdus rufopalliatus"],
  ["American Robin","Turdus migratorius"],
  ["Varied Thrush","Ixoreus naevius"],
  ["Gray Catbird","Dumetella carolinensis"],
  ["Curve-billed Thrasher","Toxostoma curvirostre"],
  ["Brown Thrasher","Toxostoma rufum"],
  ["Long-billed Thrasher","Toxostoma longirostre"],
  ["Bendire's Thrasher","Toxostoma bendirei"],
  ["California Thrasher","Toxostoma redivivum"],
  ["LeConte's Thrasher","Toxostoma lecontei"],
  ["Crissal Thrasher","Toxostoma crissale"],
  ["Sage Thrasher","Oreoscoptes montanus"],
  ["Northern Mockingbird","Mimus polyglottos"],
  ["Bohemian Waxwing","Bombycilla garrulus"],
  ["Cedar Waxwing","Bombycilla cedrorum"],
  ["Phainopepla","Phainopepla nitens"],
  ["Olive Warbler","Peucedramus taeniatus"],
  ["Eastern Yellow Wagtail","Motacilla tschutschensis"],
  ["White Wagtail","Motacilla alba"],
  ["Olive-backed Pipit","Anthus hodgsoni"],
  ["Red-throated Pipit","Anthus cervinus"],
  ["American Pipit","Anthus rubescens"],
  ["Sprague's Pipit","Anthus spragueii"],
  ["Brambling","Fringilla montifringilla"],
  ["Evening Grosbeak","Coccothraustes vespertinus"],
  ["Akikiki","Oreomystis bairdi"],
  ["Maui Alauahio","Paroreomyza montana"],
  ["Palila","Loxioides bailleui"],
  ["Laysan Finch","Telespiza cantans"],
  ["Nihoa Finch","Telespiza ultima"],
  ["Akohekohe","Palmeria dolei"],
  ["Apapane","Himatione sanguinea"],
  ["Iiwi","Drepanis coccinea"],
  ["Maui Parrotbill","Pseudonestor xanthophrys"],
  ["Akiapolaau","Hemignathus wilsoni"],
  ["Anianiau","Magumma parva"],
  ["Hawaii Amakihi","Chlorodrepanis virens"],
  ["Oahu Amakihi","Chlorodrepanis flava"],
  ["Kauai Amakihi","Chlorodrepanis stejnegeri"],
  ["Hawaii Creeper","Loxops mana"],
  ["Akekee","Loxops caeruleirostris"],
  ["Hawaii Akepa","Loxops coccineus"],
  ["Pine Grosbeak","Pinicola enucleator"],
  ["Gray-crowned Rosy-Finch","Leucosticte tephrocotis"],
  ["Black Rosy-Finch","Leucosticte atrata"],
  ["Brown-capped Rosy-Finch","Leucosticte australis"],
  ["House Finch","Haemorhous mexicanus"],
  ["Purple Finch","Haemorhous purpureus"],
  ["Cassin's Finch","Haemorhous cassinii"],
  ["Common Redpoll","Acanthis flammea"],
  ["Hoary Redpoll","Acanthis hornemanni"],
  ["Red Crossbill","Loxia curvirostra"],
  ["Cassia Crossbill","Loxia sinesciuris"],
  ["White-winged Crossbill","Loxia leucoptera"],
  ["Pine Siskin","Spinus pinus"],
  ["Lesser Goldfinch","Spinus psaltria"],
  ["Lawrence's Goldfinch","Spinus lawrencei"],
  ["American Goldfinch","Spinus tristis"],
  ["Lapland Longspur","Calcarius lapponicus"],
  ["Chestnut-collared Longspur","Calcarius ornatus"],
  ["Smith's Longspur","Calcarius pictus"],
  ["Thick-billed Longspur","Rhynchophanes mccownii"],
  ["Snow Bunting","Plectrophenax nivalis"],
  ["McKay's Bunting","Plectrophenax hyperboreus"],
  ["Rustic Bunting","Emberiza rustica"],
  ["Rufous-winged Sparrow","Peucaea carpalis"],
  ["Botteri's Sparrow","Peucaea botterii"],
  ["Cassin's Sparrow","Peucaea cassinii"],
  ["Bachman's Sparrow","Peucaea aestivalis"],
  ["Grasshopper Sparrow","Ammodramus savannarum"],
  ["Olive Sparrow","Arremonops rufivirgatus"],
  ["Five-striped Sparrow","Amphispiza quinquestriata"],
  ["Black-throated Sparrow","Amphispiza bilineata"],
  ["Lark Sparrow","Chondestes grammacus"],
  ["Lark Bunting","Calamospiza melanocorys"],
  ["Chipping Sparrow","Spizella passerina"],
  ["Clay-colored Sparrow","Spizella pallida"],
  ["Black-chinned Sparrow","Spizella atrogularis"],
  ["Field Sparrow","Spizella pusilla"],
  ["Brewer's Sparrow","Spizella breweri"],
  ["Fox Sparrow","Passerella iliaca"],
  ["American Tree Sparrow","Spizelloides arborea"],
  ["Dark-eyed Junco","Junco hyemalis"],
  ["Yellow-eyed Junco","Junco phaeonotus"],
  ["White-crowned Sparrow","Zonotrichia leucophrys"],
  ["Golden-crowned Sparrow","Zonotrichia atricapilla"],
  ["Harris's Sparrow","Zonotrichia querula"],
  ["White-throated Sparrow","Zonotrichia albicollis"],
  ["Sagebrush Sparrow","Artemisiospiza nevadensis"],
  ["Bell's Sparrow","Artemisiospiza belli"],
  ["Vesper Sparrow","Pooecetes gramineus"],
  ["LeConte's Sparrow","Ammospiza leconteii"],
  ["Seaside Sparrow","Ammospiza maritima"],
  ["Nelson's Sparrow","Ammospiza nelsoni"],
  ["Saltmarsh Sparrow","Ammospiza caudacuta"],
  ["Baird's Sparrow","Centronyx bairdii"],
  ["Henslow's Sparrow","Centronyx henslowii"],
  ["Savannah Sparrow","Passerculus sandwichensis"],
  ["Song Sparrow","Melospiza melodia"],
  ["Lincoln's Sparrow","Melospiza lincolnii"],
  ["Swamp Sparrow","Melospiza georgiana"],
  ["Canyon Towhee","Melozone fusca"],
  ["Abert's Towhee","Melozone aberti"],
  ["California Towhee","Melozone crissalis"],
  ["Rufous-crowned Sparrow","Aimophila ruficeps"],
  ["Green-tailed Towhee","Pipilo chlorurus"],
  ["Spotted Towhee","Pipilo maculatus"],
  ["Eastern Towhee","Pipilo erythrophthalmus"],
  ["Western Spindalis","Spindalis zena"],
  ["Yellow-breasted Chat","Icteria virens"],
  ["Yellow-headed Blackbird","Xanthocephalus xanthocephalus"],
  ["Bobolink","Dolichonyx oryzivorus"],
  ["Eastern Meadowlark","Sturnella magna"],
  ["Western Meadowlark","Sturnella neglecta"],
  ["Orchard Oriole","Icterus spurius"],
  ["Hooded Oriole","Icterus cucullatus"],
  ["Bullock's Oriole","Icterus bullockii"],
  ["Altamira Oriole","Icterus gularis"],
  ["Audubon's Oriole","Icterus graduacauda"],
  ["Baltimore Oriole","Icterus galbula"],
  ["Scott's Oriole","Icterus parisorum"],
  ["Red-winged Blackbird","Agelaius phoeniceus"],
  ["Tricolored Blackbird","Agelaius tricolor"],
  ["Shiny Cowbird","Molothrus bonariensis"],
  ["Bronzed Cowbird","Molothrus aeneus"],
  ["Brown-headed Cowbird","Molothrus ater"],
  ["Rusty Blackbird","Euphagus carolinus"],
  ["Brewer's Blackbird","Euphagus cyanocephalus"],
  ["Common Grackle","Quiscalus quiscula"],
  ["Boat-tailed Grackle","Quiscalus major"],
  ["Great-tailed Grackle","Quiscalus mexicanus"],
  ["Ovenbird","Seiurus aurocapilla"],
  ["Worm-eating Warbler","Helmitheros vermivorum"],
  ["Louisiana Waterthrush","Parkesia motacilla"],
  ["Northern Waterthrush","Parkesia noveboracensis"],
  ["Golden-winged Warbler","Vermivora chrysoptera"],
  ["Blue-winged Warbler","Vermivora cyanoptera"],
  ["Black-and-white Warbler","Mniotilta varia"],
  ["Prothonotary Warbler","Protonotaria citrea"],
  ["Swainson's Warbler","Limnothlypis swainsonii"],
  ["Tennessee Warbler","Leiothlypis peregrina"],
  ["Orange-crowned Warbler","Leiothlypis celata"],
  ["Colima Warbler","Leiothlypis crissalis"],
  ["Lucy's Warbler","Leiothlypis luciae"],
  ["Nashville Warbler","Leiothlypis ruficapilla"],
  ["Virginia's Warbler","Leiothlypis virginiae"],
  ["Connecticut Warbler","Oporornis agilis"],
  ["MacGillivray's Warbler","Geothlypis tolmiei"],
  ["Mourning Warbler","Geothlypis philadelphia"],
  ["Kentucky Warbler","Geothlypis formosa"],
  ["Common Yellowthroat","Geothlypis trichas"],
  ["Hooded Warbler","Setophaga citrina"],
  ["American Redstart","Setophaga ruticilla"],
  ["Kirtland's Warbler","Setophaga kirtlandii"],
  ["Cape May Warbler","Setophaga tigrina"],
  ["Cerulean Warbler","Setophaga cerulea"],
  ["Northern Parula","Setophaga americana"],
  ["Tropical Parula","Setophaga pitiayumi"],
  ["Magnolia Warbler","Setophaga magnolia"],
  ["Bay-breasted Warbler","Setophaga castanea"],
  ["Blackburnian Warbler","Setophaga fusca"],
  ["Yellow Warbler","Setophaga petechia"],
  ["Chestnut-sided Warbler","Setophaga pensylvanica"],
  ["Blackpoll Warbler","Setophaga striata"],
  ["Black-throated Blue Warbler","Setophaga caerulescens"],
  ["Palm Warbler","Setophaga palmarum"],
  ["Pine Warbler","Setophaga pinus"],
  ["Yellow-rumped Warbler","Setophaga coronata"],
  ["Yellow-throated Warbler","Setophaga dominica"],
  ["Prairie Warbler","Setophaga discolor"],
  ["Grace's Warbler","Setophaga graciae"],
  ["Black-throated Gray Warbler","Setophaga nigrescens"],
  ["Townsend's Warbler","Setophaga townsendi"],
  ["Hermit Warbler","Setophaga occidentalis"],
  ["Golden-cheeked Warbler","Setophaga chrysoparia"],
  ["Black-throated Green Warbler","Setophaga virens"],
  ["Rufous-capped Warbler","Basileuterus rufifrons"],
  ["Canada Warbler","Cardellina canadensis"],
  ["Wilson's Warbler","Cardellina pusilla"],
  ["Red-faced Warbler","Cardellina rubrifrons"],
  ["Painted Redstart","Myioborus pictus"],
  ["Hepatic Tanager","Piranga flava"],
  ["Summer Tanager","Piranga rubra"],
  ["Scarlet Tanager","Piranga olivacea"],
  ["Western Tanager","Piranga ludoviciana"],
  ["Flame-colored Tanager","Piranga bidentata"],
  ["Northern Cardinal","Cardinalis cardinalis"],
  ["Pyrrhuloxia","Cardinalis sinuatus"],
  ["Rose-breasted Grosbeak","Pheucticus ludovicianus"],
  ["Black-headed Grosbeak","Pheucticus melanocephalus"],
  ["Blue Grosbeak","Passerina caerulea"],
  ["Lazuli Bunting","Passerina amoena"],
  ["Indigo Bunting","Passerina cyanea"],
  ["Varied Bunting","Passerina versicolor"],
  ["Painted Bunting","Passerina ciris"],
  ["Dickcissel","Spiza americana"],
  ["Morelet's Seedeater","Sporophila morelleti"],
];

const TOTAL = NATIVE_SPECIES.length;
const NATIVE_SCI = new Set(NATIVE_SPECIES.map(([, s]) => s));
// Map each checklist scientific name to its index in NATIVE_SPECIES. Used to
// encode per-location species sets compactly as integer arrays in the heatmap
// point data, so the distinct-species density can de-duplicate species that
// occur at multiple nearby locations.
const SCI_TO_INDEX = new Map(NATIVE_SPECIES.map(([, s], i) => [s, i]));

// eBird scientific-name ALIASES.
// eBird/Clements periodically shuffles species between genera, and different
// export vintages emit different binomials for the SAME species. Our matcher
// keys on exact binomial strings, so a genus disagreement silently drops the
// species from the count (it lands in the "unrecognized" diagnostic bucket
// instead). This map normalizes known eBird-exported synonyms to the exact
// binomial used in NATIVE_SPECIES above, so both spellings count.
//
// Format: 'eBird-exported binomial' -> 'our canonical NATIVE_SPECIES binomial'
//
// The big one is the "pied woodpecker" genus split: eBird has placed the
// strong-billed clade (Hairy, White-headed, Arizona, Red-cockaded) in
// Leuconotopicus in some taxonomy versions while keeping the small-billed
// clade (Downy, Nuttall's, Ladder-backed) in Dryobates. Our list uses
// Dryobates throughout, so the Leuconotopicus exports need aliasing.
// Picoides spellings are included too, covering older AOS-style exports.
// When you discover a new miss in the Settings "unrecognized names"
// diagnostic, add a line here mapping it to the matching NATIVE_SPECIES name.
const SCI_ALIASES = {
  // Hairy Woodpecker
  'Leuconotopicus villosus': 'Dryobates villosus',
  'Picoides villosus': 'Dryobates villosus',
  // White-headed Woodpecker
  'Leuconotopicus albolarvatus': 'Dryobates albolarvatus',
  'Picoides albolarvatus': 'Dryobates albolarvatus',
  // Arizona Woodpecker
  'Leuconotopicus arizonae': 'Dryobates arizonae',
  'Picoides arizonae': 'Dryobates arizonae',
  // Red-cockaded Woodpecker
  'Leuconotopicus borealis': 'Dryobates borealis',
  'Picoides borealis': 'Dryobates borealis',
  // Small-billed clade — older Picoides exports → our Dryobates
  'Picoides pubescens': 'Dryobates pubescens',
  'Picoides nuttallii': 'Dryobates nuttallii',
  'Picoides scalaris': 'Dryobates scalaris',

  // Species SPLITS where the old binomial now denotes an Old World bird that
  // is NOT on our native list. Aliasing the legacy name to the current US
  // species lets pre-split exports still count. Tradeoff: a genuine Old World
  // vagrant (Common Gull / Eurasian Goshawk) in an old export would count as
  // its American sibling — acceptable, since those vagrants aren't in the 774
  // and current eBird exports already use the new names directly.
  'Larus canus': 'Larus brachyrhynchus',         // Mew Gull → Short-billed Gull (2021)
  'Accipiter gentilis': 'Astur atricapillus',    // Northern → American Goshawk (2024)

  // Plover genus move (eBird 2024): Charadrius → Anarhynchus for the
  // Kentish/Snowy/sand-plover group. Pure genus rename (same species), so
  // aliasing the legacy Charadrius name is unambiguous. Our list now uses the
  // current Anarhynchus names; these let pre-2024 exports still count.
  // (Killdeer, Piping, Semipalmated, Common Ringed Plover did NOT move — they
  // stay Charadrius and must NOT be aliased.)
  'Charadrius nivosus': 'Anarhynchus nivosus',   // Snowy Plover
  'Charadrius montanus': 'Anarhynchus montanus', // Mountain Plover
  'Charadrius mongolus': 'Anarhynchus mongolus', // Lesser Sand-Plover
  'Charadrius wilsonia': 'Anarhynchus wilsonia', // Wilson's Plover (already in list as Anarhynchus)
};

// Normalize an exported binomial to our canonical checklist name.
const canonicalSci = (s) => (s && SCI_ALIASES[s]) || s;

// Family boundaries — each entry: [first_sci_name_in_family, family_display_name].
// In ABA taxonomic order; species inherit the most-recent boundary's family.
const FAMILY_BOUNDARIES = [
  ["Dendrocygna autumnalis","Ducks, Geese & Swans"],
  ["Ortalis vetula","Chachalacas"],
  ["Oreortyx pictus","New World Quail"],
  ["Meleagris gallopavo","Grouse & Turkeys"],
  ["Phoenicopterus ruber","Flamingos"],
  ["Tachybaptus dominicus","Grebes"],
  ["Patagioenas leucocephala","Pigeons & Doves"],
  ["Crotophaga ani","Cuckoos, Roadrunners & Anis"],
  ["Chordeiles acutipennis","Nightjars"],
  ["Cypseloides niger","Swifts"],
  ["Colibri thalassinus","Hummingbirds"],
  ["Rallus obsoletus","Rails, Gallinules & Coots"],
  ["Aramus guarauna","Limpkin"],
  ["Antigone canadensis","Cranes"],
  ["Himantopus mexicanus","Stilts & Avocets"],
  ["Haematopus palliatus","Oystercatchers"],
  ["Pluvialis squatarola","Plovers"],
  ["Bartramia longicauda","Sandpipers & Phalaropes"],
  ["Stercorarius skua","Skuas & Jaegers"],
  ["Alle alle","Auks, Murres & Puffins"],
  ["Rissa tridactyla","Gulls, Terns & Skimmers"],
  ["Phaethon lepturus","Tropicbirds"],
  ["Gavia stellata","Loons"],
  ["Phoebastria immutabilis","Albatrosses"],
  ["Oceanites oceanicus","Southern Storm-Petrels"],
  ["Hydrobates furcatus","Northern Storm-Petrels"],
  ["Fulmarus glacialis","Shearwaters & Petrels"],
  ["Mycteria americana","Storks"],
  ["Fregata magnificens","Frigatebirds"],
  ["Sula dactylatra","Boobies & Gannets"],
  ["Anhinga anhinga","Anhingas"],
  ["Urile penicillatus","Cormorants"],
  ["Pelecanus erythrorhynchos","Pelicans"],
  ["Botaurus lentiginosus","Herons, Egrets & Bitterns"],
  ["Eudocimus albus","Ibises & Spoonbills"],
  ["Gymnogyps californianus","New World Vultures"],
  ["Pandion haliaetus","Osprey"],
  ["Elanus leucurus","Hawks, Kites & Eagles"],
  ["Tyto alba","Barn Owls"],
  ["Psiloscops flammeolus","Typical Owls"],
  ["Trogon elegans","Trogons"],
  ["Megaceryle torquata","Kingfishers"],
  ["Melanerpes lewis","Woodpeckers"],
  ["Caracara cheriway","Caracaras & Falcons"],
  ["Pachyramphus aglaiae","Becards & Tityras"],
  ["Camptostoma imberbe","Tyrant Flycatchers"],
  ["Lanius ludovicianus","Shrikes"],
  ["Vireo atricapilla","Vireos"],
  ["Perisoreus canadensis","Jays, Crows & Magpies"],
  ["Chasiempis sclateri","Monarch Flycatchers"],
  ["Eremophila alpestris","Larks"],
  ["Riparia riparia","Swallows & Martins"],
  ["Poecile carolinensis","Chickadees & Titmice"],
  ["Auriparus flaviceps","Verdin"],
  ["Psaltriparus minimus","Bushtit"],
  ["Sitta canadensis","Nuthatches"],
  ["Certhia americana","Treecreepers"],
  ["Salpinctes obsoletus","Wrens"],
  ["Polioptila caerulea","Gnatcatchers"],
  ["Cinclus mexicanus","Dippers"],
  ["Regulus satrapa","Kinglets"],
  ["Phylloscopus borealis","Leaf Warblers"],
  ["Chamaea fasciata","Sylviid Warblers"],
  ["Acrocephalus familiaris","Reed Warblers"],
  ["Cyanecula svecica","Old World Flycatchers & Chats"],
  ["Sialia sialis","Thrushes"],
  ["Dumetella carolinensis","Mockingbirds & Thrashers"],
  ["Bombycilla garrulus","Waxwings"],
  ["Phainopepla nitens","Silky-flycatchers"],
  ["Peucedramus taeniatus","Olive Warbler"],
  ["Motacilla tschutschensis","Wagtails & Pipits"],
  ["Fringilla montifringilla","Finches & Hawaiian Honeycreepers"],
  ["Calcarius lapponicus","Longspurs & Snow Buntings"],
  ["Emberiza rustica","Old World Buntings"],
  ["Peucaea carpalis","New World Sparrows"],
  ["Spindalis zena","Spindalises"],
  ["Icteria virens","Yellow-breasted Chat"],
  ["Xanthocephalus xanthocephalus","Blackbirds & Orioles"],
  ["Seiurus aurocapilla","New World Warblers"],
  ["Piranga flava","Cardinals, Grosbeaks & Tanagers"],
  ["Sporophila morelleti","Tanagers & Seedeaters"],
];

// Build a sci -> family lookup by walking species in order, using boundaries.
const SCI_TO_FAMILY = (() => {
  const boundaryMap = new Map(FAMILY_BOUNDARIES);
  const out = new Map();
  let current = null;
  for (const [, sci] of NATIVE_SPECIES) {
    if (boundaryMap.has(sci)) current = boundaryMap.get(sci);
    out.set(sci, current);
  }
  return out;
})();

// ABA Code 3 scientific names — 'rare but annual' species within the 774.
// 101 species. Used to power the 'Rare bird finds' stat.
const CODE_3_SCI = new Set([
  "Anser fabalis",
  "Anser serrirostris",
  "Cygnus cygnus",
  "Anas laysanensis",
  "Aythya ferina",
  "Aythya fuligula",
  "Mergellus albellus",
  "Nomonyx dominicus",
  "Phoenicopterus ruber",
  "Columbina talpacoti",
  "Crotophaga ani",
  "Cuculus canorus",
  "Antrostomus ridgwayi",
  "Aerodramus bartschi",
  "Colibri thalassinus",
  "Basilinna leucotis",
  "Saucerottia beryllina",
  "Charadrius hiaticula",
  "Anarhynchus mongolus",
  "Limosa limosa",
  "Calidris pugnax",
  "Calidris acuminata",
  "Calidris ferruginea",
  "Calidris temminckii",
  "Calidris subminuta",
  "Calidris ruficollis",
  "Gallinago gallinago",
  "Xenus cinereus",
  "Actitis hypoleucos",
  "Tringa brevipes",
  "Tringa nebularia",
  "Stercorarius skua",
  "Brachyramphus perdix",
  "Synthliboramphus hypoleucus",
  "Synthliboramphus craveri",
  "Pagophila eburnea",
  "Rhodostethia rosea",
  "Larus livens",
  "Larus schistisagus",
  "Anous ceruleus",
  "Phaethon aethereus",
  "Phaethon rubricauda",
  "Phoebastria albatrus",
  "Pelagodroma marina",
  "Hydrobates socorroensis",
  "Hydrobates tristrami",
  "Hydrobates microsoma",
  "Pterodroma arminjoniana",
  "Pterodroma ultima",
  "Pterodroma cahow",
  "Pterodroma externa",
  "Pterodroma sandwichensis",
  "Pterodroma cervicalis",
  "Pterodroma hypoleuca",
  "Pterodroma nigripennis",
  "Pterodroma feae",
  "Pterodroma cookii",
  "Bulweria bulwerii",
  "Ardenna carneipes",
  "Puffinus nativitatis",
  "Puffinus newelli",
  "Fregata minor",
  "Sula dactylatra",
  "Chondrohierax uncinatus",
  "Glaucidium brasilianum",
  "Falco femoralis",
  "Pachyramphus aglaiae",
  "Myiarchus sagrae",
  "Tyrannus savana",
  "Vireo flavoviridis",
  "Chasiempis ibidis",
  "Poecile cinctus",
  "Polioptila nigriceps",
  "Acrocephalus familiaris",
  "Calliope calliope",
  "Myadestes palmeri",
  "Turdus obscurus",
  "Turdus rufopalliatus",
  "Motacilla alba",
  "Anthus hodgsoni",
  "Anthus cervinus",
  "Fringilla montifringilla",
  "Oreomystis bairdi",
  "Loxioides bailleui",
  "Telespiza cantans",
  "Telespiza ultima",
  "Palmeria dolei",
  "Pseudonestor xanthophrys",
  "Hemignathus wilsoni",
  "Loxops mana",
  "Loxops caeruleirostris",
  "Loxops coccineus",
  "Plectrophenax hyperboreus",
  "Emberiza rustica",
  "Amphispiza quinquestriata",
  "Spindalis zena",
  "Molothrus bonariensis",
  "Setophaga pitiayumi",
  "Basileuterus rufifrons",
  "Piranga bidentata",
  "Sporophila morelleti",
]);

// IUCN Red List status for the at-risk native species within the 774.
// Source: IUCN Red List via "List of threatened birds of the United States"
// (VU/EN/CR globally threatened, plus the two Near Threatened US species).
// Scientific names reconciled to current eBird/Clements taxonomy (e.g.
// Oceanodroma→Hydrobates, Vestiaria→Drepanis, Puffinus→Ardenna,
// Ammodramus→Ammospiza, Hemignathus munroi→wilsoni, Oreomystis mana→Loxops
// mana, Hemignathus flavus/kauaiensis→Chlorodrepanis). 61 species.
const IUCN_STATUS = {
  // Vulnerable (VU)
  "Phoebastria albatrus": "VU", "Pterodroma cervicalis": "VU", "Pterodroma cookii": "VU",
  "Pterodroma externa": "VU", "Pterodroma sandwichensis": "VU", "Ardenna bulleri": "VU",
  "Ardenna creatopus": "VU", "Branta sandvicensis": "VU", "Clangula hyemalis": "VU",
  "Polysticta stelleri": "VU", "Tympanuchus pallidicinctus": "VU", "Tympanuchus cupido": "VU",
  "Fulica alai": "VU", "Rissa brevirostris": "VU", "Numenius tahitiensis": "VU",
  "Synthliboramphus craveri": "VU", "Synthliboramphus hypoleucus": "VU",
  "Aphelocoma coerulescens": "VU", "Aphelocoma insularis": "VU", "Gymnorhinus cyanocephalus": "VU",
  "Catharus bicknelli": "VU", "Myadestes obscurus": "VU", "Toxostoma bendirei": "VU",
  "Anthus spragueii": "VU", "Setophaga cerulea": "VU", "Euphagus carolinus": "VU",
  "Magumma parva": "VU", "Telespiza cantans": "VU", "Chasiempis sandwichensis": "VU",
  "Chasiempis sclateri": "VU", "Drepanis coccinea": "VU", "Ammospiza caudacuta": "VU",
  "Chlorodrepanis flava": "VU", "Chlorodrepanis stejnegeri": "VU",
  // Endangered (EN)
  "Pterodroma cahow": "EN", "Pterodroma hasitata": "EN", "Anas wyvilliana": "EN",
  "Centrocercus minimus": "EN", "Grus americana": "EN", "Brachyramphus marmoratus": "EN",
  "Setophaga chrysoparia": "EN", "Agelaius tricolor": "EN", "Loxops coccineus": "EN",
  "Paroreomyza montana": "EN", "Chasiempis ibidis": "EN", "Hydrobates homochroa": "EN",
  "Loxops mana": "EN", "Hemignathus wilsoni": "EN",
  // Critically Endangered (CR)
  "Puffinus newelli": "CR", "Anas laysanensis": "CR", "Gymnogyps californianus": "CR",
  "Myadestes palmeri": "CR", "Acrocephalus familiaris": "CR", "Loxioides bailleui": "CR",
  "Loxops caeruleirostris": "CR", "Oreomystis bairdi": "CR", "Palmeria dolei": "CR",
  "Pseudonestor xanthophrys": "CR", "Telespiza ultima": "CR",
  // Near Threatened (NT) — the two US NT species
  "Brachyramphus brevirostris": "NT", "Vireo atricapilla": "NT",
};
const AT_RISK_SCI = new Set(Object.keys(IUCN_STATUS));

// Strictly-pelagic (open-water) species: order Procellariiformes — the
// "tubenoses" (albatrosses, fulmars, gadfly petrels, shearwaters, storm-
// petrels). These spend their non-breeding lives on the open ocean and are
// realistically only observable from offshore boat trips, so the card tags
// them so the user knows they're a fundamentally different kind of target.
// They remain fully part of the native 774 (the ABA checklist includes them);
// this is a display tag only, not an exclusion. Keyed by GENUS so it stays
// correct across taxonomic revisions. Jaegers/skuas, alcids, gannets,
// tropicbirds and boobies are deliberately excluded — those are seeable from
// shore or at breeding colonies.
const PELAGIC_GENERA = new Set([
  'Phoebastria',   // albatrosses
  'Fulmarus',      // fulmars
  'Pterodroma',    // gadfly petrels
  'Bulweria',      // Bulwer's petrel
  'Calonectris',   // Cory's shearwater
  'Ardenna',       // large shearwaters
  'Puffinus',      // small shearwaters
  'Oceanites', 'Pelagodroma', 'Hydrobates', // storm-petrels
]);
const isPelagicSci = (sci) => !!sci && PELAGIC_GENERA.has(sci.split(' ')[0]);

// NOCTURNAL: owls (Strigidae, Tytonidae) + nightjars (Caprimulgidae). The tag
// signals "you'll look/listen for this at night or dusk" — a different search
// approach. A few (Snowy, Northern Hawk, Burrowing, Short-eared) also hunt by
// day, but they're still owls the birder approaches as night/dusk targets.
const NOCTURNAL_GENERA = new Set([
  'Tyto', 'Psiloscops', 'Megascops', 'Bubo', 'Surnia', 'Glaucidium',
  'Micrathene', 'Athene', 'Strix', 'Asio', 'Aegolius',           // owls
  'Chordeiles', 'Nyctidromus', 'Phalaenoptilus', 'Antrostomus',  // nightjars
]);
const isNocturnalSci = (sci) => !!sci && NOCTURNAL_GENERA.has(sci.split(' ')[0]);

// SPECIALIZED ("!"): genuinely range-restricted US specialties — birds a
// birder makes a dedicated trip for, confined to a small area (a single
// mountain range, the SE Arizona canyons, the South Texas / Florida tip, a
// lone island). This is a CURATED set (a judgment about which birds are true
// "specialties"), not a pure data rule — a single-region range alone doesn't
// qualify (e.g. common Alaskan or Hawaiian residents are not specialties).
// Keyed by scientific name. Add/remove here to tune.
const SPECIALIZED_SCI = new Set([
  // Florida / SE micro-range
  'Aphelocoma coerulescens', 'Rostrhamus sociabilis', 'Aramus guarauna',
  'Buteo brachyurus', 'Patagioenas leucocephala', 'Dryobates borealis',
  // California restricted
  'Aphelocoma insularis', 'Polioptila californica', 'Pica nuttalli',
  'Chamaea fasciata', 'Gymnogyps californianus', 'Agelaius tricolor',
  'Toxostoma redivivum',
  // SE Arizona / Southwest border specialties
  'Trogon elegans', 'Eugenes fulgens', 'Lampornis clemenciae',
  'Cynanthus latirostris', 'Basilinna leucotis', 'Leucolia violiceps',
  'Saucerottia beryllina', 'Pachyramphus aglaiae', 'Camptostoma imberbe',
  'Myiodynastes luteiventris', 'Myiarchus tuberculifer', 'Tyrannus crassirostris',
  'Megascops trichopsis', 'Glaucidium brasilianum', 'Micrathene whitneyi',
  'Cardellina rubrifrons', 'Myioborus pictus', 'Basileuterus rufifrons',
  'Peucedramus taeniatus', 'Aimophila ruficeps', 'Amphispiza quinquestriata',
  'Peucaea carpalis', 'Aphelocoma wollweberi', 'Poecile sclateri',
  'Baeolophus wollweberi', 'Auriparus flaviceps', 'Toxostoma crissale',
  'Toxostoma lecontei', 'Spizella atrogularis', 'Vireo vicinior',
  // South Texas specialties
  'Pitangus sulphuratus', 'Icterus gularis', 'Icterus graduacauda',
  'Leptotila verreauxi', 'Ortalis vetula', 'Geranoaetus albicaudatus',
  'Buteogallus anthracinus', 'Caracara cheriway', 'Falco femoralis',
  'Sporophila morelleti', 'Spindalis zena', 'Setophaga pitiayumi',
  'Arremonops rufivirgatus', 'Cyanocorax yncas',
  // Range-restricted breeders / endangered specialties
  'Setophaga kirtlandii', 'Setophaga chrysoparia', 'Vireo atricapilla',
  'Centrocercus minimus', 'Tympanuchus pallidicinctus', 'Loxia sinesciuris',
  'Leucosticte atrata', 'Leucosticte australis',
]);
const isSpecializedSci = (sci) => !!sci && SPECIALIZED_SCI.has(sci);

// ----------------------------------------------------------------------------
// Achievement badges.
//
// Each badge group is a category with one or more tiers. A tier unlocks when
// the user's `value` for that category reaches the tier's `threshold`. The
// page renders all tiers, greying out locked ones, and shows progress toward
// the next. Everything is derived from already-computed stats (species count,
// regions explored, threatened seen, trait counts) — no new tracking needed.
//
// A "stats" object is assembled at render time and passed to each group's
// `value(stats)` selector. Tiers are sorted ascending by threshold.
// ----------------------------------------------------------------------------
const LOWER_48_REGION_IDS = ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se']; // excludes ak, hi
const ALL_REGION_IDS = ['pnw', 'cal', 'ak', 'hi', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'];
const FOWL_PLAY_THRESHOLD = 10; // distinct US non-native species for the Fowl Play badge

const BADGE_GROUPS = [
  {
    id: 'species',
    title: 'Life List',
    blurb: 'Total native species observed',
    icon: 'feather',
    accent: '#5cba87',
    value: (s) => s.speciesCount,
    tiers: [
      { threshold: 50,  name: 'Fledgling',       desc: '50 species' },
      { threshold: 100, name: 'Backyard Birder', desc: '100 species' },
      { threshold: 200, name: 'Bird Nerd',       desc: '200 species' },
      { threshold: 300, name: 'Avian Expert',    desc: '300 species' },
      { threshold: 400, name: 'Field Ornithologist', desc: '400 species' },
      { threshold: 500, name: 'Master Lister',   desc: '500 species' },
      { threshold: 600, name: 'Grand Naturalist', desc: '600 species' },
      { threshold: 700, name: 'Big Year Birder', desc: '700 species' },
      { threshold: 774, name: 'Lord of the Wings', desc: 'Every native species' },
    ],
  },
  {
    id: 'regions',
    title: 'Explorer',
    blurb: 'Regions where you’ve recorded a species',
    icon: 'globe',
    accent: '#6cb8e4',
    value: (s) => s.regionCount,
    tiers: [
      { threshold: 2,  name: 'Wanderer',     desc: '2 regions' },
      { threshold: 4,  name: 'Roamer',       desc: '4 regions' },
      { threshold: 6,  name: 'Adventurer',   desc: '6 regions' },
      { threshold: 8,  name: 'Jetsetter',    desc: '8 regions' },
      { threshold: 9,  name: 'Lower 48',     desc: 'All 9 lower-48 regions', custom: 'lower48' },
      { threshold: 11, name: 'Globetrotter', desc: 'All 11 regions (incl. AK & HI)' },
      { name: 'Coast to Coast',     desc: 'An East & a West coast region', custom: 'coast' },
      { name: 'Island Hopper',      desc: 'Visit Hawaii',         custom: 'hawaii' },
      { name: 'Polar Express',      desc: 'Visit Alaska',         custom: 'alaska' },
    ],
  },
  {
    id: 'threatened',
    title: 'Guardian',
    blurb: 'IUCN-threatened species observed',
    icon: 'shield',
    accent: '#c9a01a',
    value: (s) => s.threatenedCount,
    tiers: [
      { threshold: 1,  name: 'First Watch',     desc: 'First threatened species' },
      { threshold: 15, name: 'Protector',       desc: '15 threatened species' },
      { threshold: 30, name: 'Steward',         desc: '30 threatened species' },
      { threshold: 45, name: 'Conservationist', desc: '45 threatened species' },
      { threshold: 61, name: 'Last Stand',      desc: 'All 61 at-risk species' },
    ],
  },
  {
    id: 'traits',
    title: 'Specialist',
    blurb: 'Tougher kinds of birds to find',
    icon: 'sparkles',
    accent: '#ff6b6b',
    // trait group is special: each tier checks a DIFFERENT boolean, not a count.
    custom: 'traits',
    tiers: [
      { key: 'pelagic',     name: 'Sea Legs',            desc: 'See your first pelagic species',     icon: 'waves',     accent: '#1f7ab0' },
      { key: 'nocturnal',   name: 'Night Owl',           desc: 'See your first nocturnal species',    icon: 'moonstars', accent: '#3b3270' },
      { key: 'specialized', name: 'Off the Beaten Path', desc: 'See your first specialized species',  icon: 'boot',      accent: '#c2622a' },
      { key: 'fowlplay',    name: 'Fowl Play',           desc: '10 non-native species in the US',     icon: 'mask',      accent: '#ff6b6b' },
    ],
  },
];

// Single source of truth for whether a given tier is unlocked, handling both
// the count-based tiers (threshold vs the group's value) and the custom-keyed
// tiers (region milestones, coastal, trait booleans). Used by the tally, the
// tile render, and the detail popup so the logic never drifts between them.
function isTierUnlocked(group, tier, stats) {
  if (group.custom === 'traits') return !!stats.traits[tier.key];
  switch (tier.custom) {
    case 'lower48': return !!stats.lower48Done;
    case 'hawaii':  return !!stats.hawaiiDone;
    case 'alaska':  return !!stats.alaskaDone;
    case 'coast':   return !!stats.coastToCoastDone;
    default: break;
  }
  return group.value(stats) >= tier.threshold;
}

// ----------------------------------------------------------------------------
// Per-species reference data for the detail card. These are STUBS to be filled
// in a later data-generation pass (we deliberately don't generate all 774 up
// front). All are keyed by binomial scientific name. When a species is absent
// from a map, the card shows a graceful "coming soon" / unknown state.
//
//   SPECIES_MOVEMENT[sci] = 'migratory' | 'resident' | 'partial'
//   SPECIES_RANGE[sci]    = [regionId, ...]   // true range, app region ids
//   SPECIES_FACTS[sci]    = 'one-sentence quick fact'
//
// regionIds are the REGIONS ids: pnw, cal, ak, hi, sw, rm, gp, sp, mw, ne, se.
// ----------------------------------------------------------------------------
const SPECIES_MOVEMENT = {
  // Movement classification (lower-48 predominant pattern):
  // 'resident' = present year-round across most of its lower-48 range,
  // 'migratory' = bulk of the lower-48 population vacates seasonally,
  // 'partial' = a substantial share does each (e.g. resident in the
  // south, migratory in the north). Generated for the 160 currently-seen
  // species; remaining checklist species fill in a later pass.
  'Aphelocoma californica': 'resident',
  'Auriparus flaviceps': 'resident',
  'Baeolophus bicolor': 'resident',
  'Baeolophus inornatus': 'resident',
  'Buteo lineatus': 'resident',
  'Calypte anna': 'resident',
  'Campylorhynchus brunneicapillus': 'resident',
  'Cardinalis cardinalis': 'resident',
  'Catherpes mexicanus': 'resident',
  'Chamaea fasciata': 'resident',
  'Cinclus mexicanus': 'resident',
  'Coragyps atratus': 'resident',
  'Corvus corax': 'resident',
  'Corvus ossifragus': 'resident',
  'Cyanocitta stelleri': 'resident',
  'Dryobates nuttallii': 'resident',
  'Dryobates pubescens': 'resident',
  'Dryobates scalaris': 'resident',
  'Dryobates villosus': 'resident',
  'Dryocopus pileatus': 'resident',
  'Haemorhous mexicanus': 'resident',
  'Larus occidentalis': 'resident',
  'Melanerpes carolinus': 'resident',
  'Melanerpes formicivorus': 'resident',
  'Meleagris gallopavo': 'resident',
  'Melozone aberti': 'resident',
  'Melozone crissalis': 'resident',
  'Mimus polyglottos': 'resident',
  'Nucifraga columbiana': 'resident',
  'Poecile atricapillus': 'resident',
  'Poecile carolinensis': 'resident',
  'Poecile rufescens': 'resident',
  'Psaltriparus minimus': 'resident',
  'Quiscalus major': 'resident',
  'Quiscalus mexicanus': 'resident',
  'Sayornis nigricans': 'resident',
  'Sitta carolinensis': 'resident',
  'Sitta pusilla': 'resident',
  'Spinus psaltria': 'resident',
  'Strix varia': 'resident',
  'Thryomanes bewickii': 'resident',
  'Thryothorus ludovicianus': 'resident',
  'Urile pelagicus': 'resident',
  'Aeronautes saxatalis': 'partial',
  'Agelaius phoeniceus': 'partial',
  'Amphispiza bilineata': 'partial',
  'Anarhynchus nivosus': 'partial',
  'Anas platyrhynchos': 'partial',
  'Anhinga anhinga': 'partial',
  'Ardea alba': 'partial',
  'Ardea herodias': 'partial',
  'Astur cooperii': 'partial',
  'Bombycilla cedrorum': 'partial',
  'Branta canadensis': 'partial',
  'Buteo jamaicensis': 'partial',
  'Calypte costae': 'partial',
  'Cathartes aura': 'partial',
  'Catharus guttatus': 'partial',
  'Certhia americana': 'partial',
  'Charadrius vociferus': 'partial',
  'Colaptes auratus': 'partial',
  'Corvus brachyrhynchos': 'partial',
  'Cyanocitta cristata': 'partial',
  'Egretta caerulea': 'partial',
  'Egretta thula': 'partial',
  'Egretta tricolor': 'partial',
  'Eudocimus albus': 'partial',
  'Euphagus cyanocephalus': 'partial',
  'Falco peregrinus': 'partial',
  'Falco sparverius': 'partial',
  'Fulica americana': 'partial',
  'Gallinula galeata': 'partial',
  'Geothlypis trichas': 'partial',
  'Haemorhous purpureus': 'partial',
  'Haliaeetus leucocephalus': 'partial',
  'Ixoreus naevius': 'partial',
  'Junco hyemalis': 'partial',
  'Larus californicus': 'partial',
  'Larus delawarensis': 'partial',
  'Larus heermanni': 'partial',
  'Leucophaeus atricilla': 'partial',
  'Lophodytes cucullatus': 'partial',
  'Megaceryle alcyon': 'partial',
  'Melanerpes erythrocephalus': 'partial',
  'Melospiza georgiana': 'partial',
  'Melospiza melodia': 'partial',
  'Molothrus ater': 'partial',
  'Nannopterum auritum': 'partial',
  'Nycticorax nycticorax': 'partial',
  'Oxyura jamaicensis': 'partial',
  'Pandion haliaetus': 'partial',
  'Pelecanus occidentalis': 'partial',
  'Pipilo erythrophthalmus': 'partial',
  'Plegadis falcinellus': 'partial',
  'Podilymbus podiceps': 'partial',
  'Polioptila caerulea': 'partial',
  'Pyrocephalus rubinus': 'partial',
  'Quiscalus quiscula': 'partial',
  'Regulus satrapa': 'partial',
  'Rynchops niger': 'partial',
  'Sayornis phoebe': 'partial',
  'Sayornis saya': 'partial',
  'Selasphorus sasin': 'partial',
  'Setophaga coronata': 'partial',
  'Setophaga dominica': 'partial',
  'Setophaga pinus': 'partial',
  'Sialia sialis': 'partial',
  'Spinus tristis': 'partial',
  'Spizella passerina': 'partial',
  'Sterna forsteri': 'partial',
  'Sturnella magna': 'partial',
  'Thalasseus elegans': 'partial',
  'Toxostoma rufum': 'partial',
  'Troglodytes pacificus': 'partial',
  'Turdus migratorius': 'partial',
  'Vireo griseus': 'partial',
  'Zenaida macroura': 'partial',
  'Anarhynchus wilsonia': 'migratory',
  'Arenaria interpres': 'migratory',
  'Arenaria melanocephala': 'migratory',
  'Bucephala albeola': 'migratory',
  'Bucephala clangula': 'migratory',
  'Calidris alba': 'migratory',
  'Calidris minutilla': 'migratory',
  'Calidris pusilla': 'migratory',
  'Cardellina canadensis': 'migratory',
  'Chaetura pelagica': 'migratory',
  'Charadrius melodus': 'migratory',
  'Charadrius semipalmatus': 'migratory',
  'Corthylio calendula': 'migratory',
  'Dumetella carolinensis': 'migratory',
  'Elanoides forficatus': 'migratory',
  'Empidonax minimus': 'migratory',
  'Hylocichla mustelina': 'migratory',
  'Limnodromus griseus': 'migratory',
  'Limosa fedoa': 'migratory',
  'Mareca americana': 'migratory',
  'Mergus serrator': 'migratory',
  'Mniotilta varia': 'migratory',
  'Myiarchus cinerascens': 'migratory',
  'Myiarchus crinitus': 'migratory',
  'Numenius americanus': 'migratory',
  'Passerina ciris': 'migratory',
  'Passerina cyanea': 'migratory',
  'Petrochelidon pyrrhonota': 'migratory',
  'Piranga rubra': 'migratory',
  'Pluvialis squatarola': 'migratory',
  'Protonotaria citrea': 'migratory',
  'Selasphorus rufus': 'migratory',
  'Setophaga americana': 'migratory',
  'Setophaga caerulescens': 'migratory',
  'Setophaga citrina': 'migratory',
  'Setophaga palmarum': 'migratory',
  'Setophaga pensylvanica': 'migratory',
  'Setophaga tigrina': 'migratory',
  'Sphyrapicus varius': 'migratory',
  'Tringa semipalmata': 'migratory',
  'Tyrannus tyrannus': 'migratory',
  'Tyrannus vociferans': 'migratory',
  'Zonotrichia albicollis': 'migratory',
  // ---- remaining checklist species (lower-48 rule) ----
  'Loxops caeruleirostris': 'resident',  // Akekee
  'Hemignathus wilsoni': 'resident',  // Akiapolaau
  'Oreomystis bairdi': 'resident',  // Akikiki
  'Palmeria dolei': 'resident',  // Akohekohe
  'Icterus gularis': 'resident',  // Altamira Oriole
  'Phoenicopterus ruber': 'resident',  // American Flamingo
  'Picoides dorsalis': 'resident',  // American Three-toed Woodpecker
  'Magumma parva': 'resident',  // Anianiau
  'Himatione sanguinea': 'resident',  // Apapane
  'Falco femoralis': 'resident',  // Aplomado Falcon
  'Dryobates arizonae': 'resident',  // Arizona Woodpecker
  'Icterus graduacauda': 'resident',  // Audubon's Oriole
  'Puffinus lherminieri': 'resident',  // Audubon's Shearwater
  'Tyto alba': 'resident',  // Barn Owl
  'Artemisiospiza belli': 'resident',  // Bell's Sparrow
  'Saucerottia beryllina': 'resident',  // Berylline Hummingbird
  'Anous minutus': 'resident',  // Black Noddy
  'Haematopus bachmani': 'resident',  // Black Oystercatcher
  'Picoides arcticus': 'resident',  // Black-backed Woodpecker
  'Pica hudsonia': 'resident',  // Black-billed Magpie
  'Baeolophus atricristatus': 'resident',  // Black-crested Titmouse
  'Polioptila melanura': 'resident',  // Black-tailed Gnatcatcher
  'Anous ceruleus': 'resident',  // Blue-gray Noddy
  'Pterodroma hypoleuca': 'resident',  // Bonin Petrel
  'Poecile hudsonicus': 'resident',  // Boreal Chickadee
  'Aegolius funereus': 'resident',  // Boreal Owl
  'Baeolophus wollweberi': 'resident',  // Bridled Titmouse
  'Sula leucogaster': 'resident',  // Brown Booby
  'Anous stolidus': 'resident',  // Brown Noddy
  'Amazilia yucatanensis': 'resident',  // Buff-bellied Hummingbird
  'Gymnogyps californianus': 'resident',  // California Condor
  'Polioptila californica': 'resident',  // California Gnatcatcher
  'Callipepla californica': 'resident',  // California Quail
  'Toxostoma redivivum': 'resident',  // California Thrasher
  'Perisoreus canadensis': 'resident',  // Canada Jay
  'Melozone fusca': 'resident',  // Canyon Towhee
  'Loxia sinesciuris': 'resident',  // Cassia Crossbill
  'Ptychoramphus aleuticus': 'resident',  // Cassin's Auklet
  'Puffinus nativitatis': 'resident',  // Christmas Shearwater
  'Rallus crepitans': 'resident',  // Clapper Rail
  'Turdus grayi': 'resident',  // Clay-colored Thrush
  'Columbina passerina': 'resident',  // Common Ground Dove
  'Nyctidromus albicollis': 'resident',  // Common Pauraque
  'Synthliboramphus craveri': 'resident',  // Craveri's Murrelet
  'Aethia cristatella': 'resident',  // Crested Auklet
  'Caracara cheriway': 'resident',  // Crested Caracara
  'Toxostoma crissale': 'resident',  // Crissal Thrasher
  'Toxostoma curvirostre': 'resident',  // Curve-billed Thrasher
  'Dendragapus obscurus': 'resident',  // Dusky Grouse
  'Megascops asio': 'resident',  // Eastern Screech-Owl
  'Glaucidium brasilianum': 'resident',  // Ferruginous Pygmy-Owl
  'Aphelocoma coerulescens': 'resident',  // Florida Scrub-Jay
  'Callipepla gambelii': 'resident',  // Gambel's Quail
  'Melanerpes uropygialis': 'resident',  // Gila Woodpecker
  'Colaptes chrysoides': 'resident',  // Gilded Flicker
  'Melanerpes aurifrons': 'resident',  // Golden-fronted Woodpecker
  'Poecile cinctus': 'resident',  // Gray-headed Chickadee
  'Fregata minor': 'resident',  // Great Frigatebird
  'Strix nebulosa': 'resident',  // Great Gray Owl
  'Bubo virginianus': 'resident',  // Great Horned Owl
  'Pitangus sulphuratus': 'resident',  // Great Kiskadee
  'Tympanuchus cupido': 'resident',  // Greater Prairie-Chicken
  'Geococcyx californianus': 'resident',  // Greater Roadrunner
  'Centrocercus urophasianus': 'resident',  // Greater Sage-Grouse
  'Cyanocorax yncas': 'resident',  // Green Jay
  'Chloroceryle americana': 'resident',  // Green Kingfisher
  'Synthliboramphus hypoleucus': 'resident',  // Guadalupe Murrelet
  'Centrocercus minimus': 'resident',  // Gunnison Sage-Grouse
  'Parabuteo unicinctus': 'resident',  // Harris's Hawk
  'Loxops coccineus': 'resident',  // Hawaii Akepa
  'Chlorodrepanis virens': 'resident',  // Hawaii Amakihi
  'Loxops mana': 'resident',  // Hawaii Creeper
  'Chasiempis sandwichensis': 'resident',  // Hawaii Elepaio
  'Fulica alai': 'resident',  // Hawaiian Coot
  'Anas wyvilliana': 'resident',  // Hawaiian Duck
  'Branta sandvicensis': 'resident',  // Hawaiian Goose
  'Buteo solitarius': 'resident',  // Hawaiian Hawk
  'Pterodroma sandwichensis': 'resident',  // Hawaiian Petrel
  'Chondrohierax uncinatus': 'resident',  // Hook-billed Kite
  'Vireo huttoni': 'resident',  // Hutton's Vireo
  'Drepanis coccinea': 'resident',  // Iiwi
  'Columbina inca': 'resident',  // Inca Dove
  'Aphelocoma insularis': 'resident',  // Island Scrub-Jay
  'Baeolophus ridgwayi': 'resident',  // Juniper Titmouse
  'Chlorodrepanis stejnegeri': 'resident',  // Kauai Amakihi
  'Chasiempis sclateri': 'resident',  // Kauai Elepaio
  'Brachyramphus brevirostris': 'resident',  // Kittlitz's Murrelet
  'Myiarchus sagrae': 'resident',  // La Sagra's Flycatcher
  'Anas laysanensis': 'resident',  // Laysan Duck
  'Telespiza cantans': 'resident',  // Laysan Finch
  'Toxostoma lecontei': 'resident',  // LeConte's Thrasher
  'Aethia pusilla': 'resident',  // Least Auklet
  'Tachybaptus dominicus': 'resident',  // Least Grebe
  'Tympanuchus pallidicinctus': 'resident',  // Lesser Prairie-Chicken
  'Aramus guarauna': 'resident',  // Limpkin
  'Toxostoma longirostre': 'resident',  // Long-billed Thrasher
  'Brachyramphus marmoratus': 'resident',  // Marbled Murrelet
  'Aerodramus bartschi': 'resident',  // Mariana Swiftlet
  'Sula dactylatra': 'resident',  // Masked Booby
  'Nomonyx dominicus': 'resident',  // Masked Duck
  'Paroreomyza montana': 'resident',  // Maui Alauahio
  'Pseudonestor xanthophrys': 'resident',  // Maui Parrotbill
  'Poecile sclateri': 'resident',  // Mexican Chickadee
  'Anas diazi': 'resident',  // Mexican Duck
  'Aphelocoma wollweberi': 'resident',  // Mexican Jay
  'Acrocephalus familiaris': 'resident',  // Millerbird
  'Cyrtonyx montezumae': 'resident',  // Montezuma Quail
  'Sporophila morelleti': 'resident',  // Morelet's Seedeater
  'Anas fulvigula': 'resident',  // Mottled Duck
  'Poecile gambeli': 'resident',  // Mountain Chickadee
  'Oreortyx pictus': 'resident',  // Mountain Quail
  'Cairina moschata': 'resident',  // Muscovy Duck
  'Telespiza ultima': 'resident',  // Nihoa Finch
  'Camptostoma imberbe': 'resident',  // Northern Beardless-Tyrannulet
  'Colinus virginianus': 'resident',  // Northern Bobwhite
  'Surnia ulula': 'resident',  // Northern Hawk Owl
  'Glaucidium gnoma': 'resident',  // Northern Pygmy-Owl
  'Chlorodrepanis flava': 'resident',  // Oahu Amakihi
  'Chasiempis ibidis': 'resident',  // Oahu Elepaio
  'Arremonops rufivirgatus': 'resident',  // Olive Sparrow
  'Peucedramus taeniatus': 'resident',  // Olive Warbler
  'Myadestes obscurus': 'resident',  // Omao
  'Loxioides bailleui': 'resident',  // Palila
  'Gymnorhinus cyanocephalus': 'resident',  // Pinyon Jay
  'Ortalis vetula': 'resident',  // Plain Chachalaca
  'Myadestes palmeri': 'resident',  // Puaiohi
  'Sitta pygmaea': 'resident',  // Pygmy Nuthatch
  'Cardinalis sinuatus': 'resident',  // Pyrrhuloxia
  'Loxia curvirostra': 'resident',  // Red Crossbill
  'Patagioenas flavirostris': 'resident',  // Red-billed Pigeon
  'Dryobates borealis': 'resident',  // Red-cockaded Woodpecker
  'Urile urile': 'resident',  // Red-faced Cormorant
  'Sula sula': 'resident',  // Red-footed Booby
  'Phaethon rubricauda': 'resident',  // Red-tailed Tropicbird
  'Rallus obsoletus': 'resident',  // Ridgway's Rail
  'Megaceryle torquata': 'resident',  // Ringed Kingfisher
  'Lagopus muta': 'resident',  // Rock Ptarmigan
  'Columbina talpacoti': 'resident',  // Ruddy Ground Dove
  'Bonasa umbellus': 'resident',  // Ruffed Grouse
  'Turdus rufopalliatus': 'resident',  // Rufous-backed Robin
  'Basileuterus rufifrons': 'resident',  // Rufous-capped Warbler
  'Aimophila ruficeps': 'resident',  // Rufous-crowned Sparrow
  'Peucaea carpalis': 'resident',  // Rufous-winged Sparrow
  'Callipepla squamata': 'resident',  // Scaled Quail
  'Synthliboramphus scrippsi': 'resident',  // Scripps's Murrelet
  'Ammospiza maritima': 'resident',  // Seaside Sparrow
  'Tympanuchus phasianellus': 'resident',  // Sharp-tailed Grouse
  'Crotophaga ani': 'resident',  // Smooth-billed Ani
  'Rostrhamus sociabilis': 'resident',  // Snail Kite
  'Dendragapus fuliginosus': 'resident',  // Sooty Grouse
  'Strix occidentalis': 'resident',  // Spotted Owl
  'Falcipennis canadensis': 'resident',  // Spruce Grouse
  'Agelaius tricolor': 'resident',  // Tricolored Blackbird
  'Leucolia violiceps': 'resident',  // Violet-crowned Hummingbird
  'Megascops kennicottii': 'resident',  // Western Screech-Owl
  'Spindalis zena': 'resident',  // Western Spindalis
  'Aethia pygmaea': 'resident',  // Whiskered Auklet
  'Megascops trichopsis': 'resident',  // Whiskered Screech-Owl
  'Gygis alba': 'resident',  // White Tern
  'Dryobates albolarvatus': 'resident',  // White-headed Woodpecker
  'Geranoaetus albicaudatus': 'resident',  // White-tailed Hawk
  'Elanus leucurus': 'resident',  // White-tailed Kite
  'Lagopus leucura': 'resident',  // White-tailed Ptarmigan
  'Phaethon lepturus': 'resident',  // White-tailed Tropicbird
  'Leptotila verreauxi': 'resident',  // White-tipped Dove
  'Lagopus lagopus': 'resident',  // Willow Ptarmigan
  'Aphelocoma woodhouseii': 'resident',  // Woodhouse's Scrub-Jay
  'Pica nuttalli': 'resident',  // Yellow-billed Magpie
  'Junco phaeonotus': 'resident',  // Yellow-eyed Junco
  'Anas rubripes': 'partial',  // American Black Duck
  'Astur atricapillus': 'partial',  // American Goshawk
  'Haematopus palliatus': 'partial',  // American Oystercatcher
  'Scolopax minor': 'partial',  // American Woodcock
  'Synthliboramphus antiquus': 'partial',  // Ancient Murrelet
  'Hydrobates homochroa': 'partial',  // Ashy Storm-Petrel
  'Peucaea aestivalis': 'partial',  // Bachman's Sparrow
  'Patagioenas fasciata': 'partial',  // Band-tailed Pigeon
  'Toxostoma bendirei': 'partial',  // Bendire's Thrasher
  'Cepphus grylle': 'partial',  // Black Guillemot
  'Laterallus jamaicensis': 'partial',  // Black Rail
  'Leucosticte atrata': 'partial',  // Black Rosy-Finch
  'Dendrocygna autumnalis': 'partial',  // Black-bellied Whistling-Duck
  'Polioptila nigriceps': 'partial',  // Black-capped Gnatcatcher
  'Spizella atrogularis': 'partial',  // Black-chinned Sparrow
  'Phoebastria nigripes': 'partial',  // Black-footed Albatross
  'Himantopus mexicanus': 'partial',  // Black-necked Stilt
  'Puffinus opisthomelas': 'partial',  // Black-vented Shearwater
  'Lampornis clemenciae': 'partial',  // Blue-throated Mountain-gem
  'Peucaea botterii': 'partial',  // Botteri's Sparrow
  'Urile penicillatus': 'partial',  // Brandt's Cormorant
  'Cynanthus latirostris': 'partial',  // Broad-billed Hummingbird
  'Molothrus aeneus': 'partial',  // Bronzed Cowbird
  'Leucosticte australis': 'partial',  // Brown-capped Rosy-Finch
  'Empidonax fulvifrons': 'partial',  // Buff-breasted Flycatcher
  'Athene cunicularia': 'partial',  // Burrowing Owl
  'Haemorhous cassinii': 'partial',  // Cassin's Finch
  'Peucaea cassinii': 'partial',  // Cassin's Sparrow
  'Bubulcus ibis': 'partial',  // Cattle Egret
  'Petrochelidon fulva': 'partial',  // Cave Swallow
  'Corvus cryptoleucus': 'partial',  // Chihuahuan Raven
  'Aechmophorus clarkii': 'partial',  // Clark's Grebe
  'Buteogallus anthracinus': 'partial',  // Common Black Hawk
  'Somateria mollissima': 'partial',  // Common Eider
  'Gavia immer': 'partial',  // Common Loon
  'Mergus merganser': 'partial',  // Common Merganser
  'Uria aalge': 'partial',  // Common Murre
  'Phalaenoptilus nuttallii': 'partial',  // Common Poorwill
  'Tyrannus couchii': 'partial',  // Couch's Kingbird
  'Myiarchus tuberculifer': 'partial',  // Dusky-capped Flycatcher
  'Podiceps nigricollis': 'partial',  // Eared Grebe
  'Trogon elegans': 'partial',  // Elegant Trogon
  'Coccothraustes vespertinus': 'partial',  // Evening Grosbeak
  'Buteo regalis': 'partial',  // Ferruginous Hawk
  'Spizella pusilla': 'partial',  // Field Sparrow
  'Amphispiza quinquestriata': 'partial',  // Five-striped Sparrow
  'Piranga bidentata': 'partial',  // Flame-colored Tanager
  'Hydrobates furcatus': 'partial',  // Fork-tailed Storm-Petrel
  'Dendrocygna bicolor': 'partial',  // Fulvous Whistling-Duck
  'Mareca strepera': 'partial',  // Gadwall
  'Larus glaucescens': 'partial',  // Glaucous-winged Gull
  'Aquila chrysaetos': 'partial',  // Golden Eagle
  'Ammodramus savannarum': 'partial',  // Grasshopper Sparrow
  'Buteo plagiatus': 'partial',  // Gray Hawk
  'Vireo vicinior': 'partial',  // Gray Vireo
  'Leucosticte tephrocotis': 'partial',  // Gray-crowned Rosy-Finch
  'Larus marinus': 'partial',  // Great Black-backed Gull
  'Phalacrocorax carbo': 'partial',  // Great Cormorant
  'Butorides virescens': 'partial',  // Green Heron
  'Crotophaga sulcirostris': 'partial',  // Groove-billed Ani
  'Falco rusticolus': 'partial',  // Gyrfalcon
  'Centronyx henslowii': 'partial',  // Henslow's Sparrow
  'Piranga flava': 'partial',  // Hepatic Tanager
  'Larus argentatus': 'partial',  // Herring Gull
  'Icterus cucullatus': 'partial',  // Hooded Oriole
  'Eremophila alpestris': 'partial',  // Horned Lark
  'Fratercula corniculata': 'partial',  // Horned Puffin
  'Troglodytes aedon': 'partial',  // House Wren
  'Rallus elegans': 'partial',  // King Rail
  'Chondestes grammacus': 'partial',  // Lark Sparrow
  'Spinus lawrencei': 'partial',  // Lawrence's Goldfinch
  'Phoebastria immutabilis': 'partial',  // Laysan Albatross
  'Melanerpes lewis': 'partial',  // Lewis's Woodpecker
  'Lanius ludovicianus': 'partial',  // Loggerhead Shrike
  'Asio otus': 'partial',  // Long-eared Owl
  'Fregata magnificens': 'partial',  // Magnificent Frigatebird
  'Coccyzus minor': 'partial',  // Mangrove Cuckoo
  'Cistothorus palustris': 'partial',  // Marsh Wren
  'Falco columbarius': 'partial',  // Merlin
  'Colibri thalassinus': 'partial',  // Mexican Violetear
  'Sialia currucoides': 'partial',  // Mountain Bluebird
  'Nannopterum brasilianum': 'partial',  // Neotropic Cormorant
  'Fulmarus glacialis': 'partial',  // Northern Fulmar
  'Circus hudsonius': 'partial',  // Northern Harrier
  'Aegolius acadicus': 'partial',  // Northern Saw-whet Owl
  'Leiothlypis celata': 'partial',  // Orange-crowned Warbler
  'Myioborus pictus': 'partial',  // Painted Redstart
  'Aethia psittacula': 'partial',  // Parakeet Auklet
  'Phainopepla nitens': 'partial',  // Phainopepla
  'Cepphus columba': 'partial',  // Pigeon Guillemot
  'Pinicola enucleator': 'partial',  // Pine Grosbeak
  'Spinus pinus': 'partial',  // Pine Siskin
  'Vireo plumbeus': 'partial',  // Plumbeous Vireo
  'Falco mexicanus': 'partial',  // Prairie Falcon
  'Porphyrio martinicus': 'partial',  // Purple Gallinule
  'Alca torda': 'partial',  // Razorbill
  'Phaethon aethereus': 'partial',  // Red-billed Tropicbird
  'Sitta canadensis': 'partial',  // Red-breasted Nuthatch
  'Sphyrapicus ruber': 'partial',  // Red-breasted Sapsucker
  'Sphyrapicus nuchalis': 'partial',  // Red-naped Sapsucker
  'Egretta rufescens': 'partial',  // Reddish Egret
  'Cerorhinca monocerata': 'partial',  // Rhinoceros Auklet
  'Eugenes fulgens': 'partial',  // Rivoli's Hummingbird
  'Salpinctes obsoletus': 'partial',  // Rock Wren
  'Pachyramphus aglaiae': 'partial',  // Rose-throated Becard
  'Platalea ajaja': 'partial',  // Roseate Spoonbill
  'Thalasseus maximus': 'partial',  // Royal Tern
  'Oreoscoptes montanus': 'partial',  // Sage Thrasher
  'Artemisiospiza nevadensis': 'partial',  // Sagebrush Sparrow
  'Antigone canadensis': 'partial',  // Sandhill Crane
  'Passerculus sandwichensis': 'partial',  // Savannah Sparrow
  'Icterus parisorum': 'partial',  // Scott's Oriole
  'Cistothorus platensis': 'partial',  // Sedge Wren
  'Accipiter striatus': 'partial',  // Sharp-shinned Hawk
  'Molothrus bonariensis': 'partial',  // Shiny Cowbird
  'Asio flammeus': 'partial',  // Short-eared Owl
  'Buteo brachyurus': 'partial',  // Short-tailed Hawk
  'Pipilo maculatus': 'partial',  // Spotted Towhee
  'Tyrannus crassirostris': 'partial',  // Thick-billed Kingbird
  'Uria lomvia': 'partial',  // Thick-billed Murre
  'Myadestes townsendi': 'partial',  // Townsend's Solitaire
  'Tyrannus melancholicus': 'partial',  // Tropical Kingbird
  'Setophaga pitiayumi': 'partial',  // Tropical Parula
  'Cygnus buccinator': 'partial',  // Trumpeter Swan
  'Fratercula cirrhata': 'partial',  // Tufted Puffin
  'Passerina versicolor': 'partial',  // Varied Bunting
  'Rallus limicola': 'partial',  // Virginia Rail
  'Sialia mexicana': 'partial',  // Western Bluebird
  'Aechmophorus occidentalis': 'partial',  // Western Grebe
  'Sturnella neglecta': 'partial',  // Western Meadowlark
  'Patagioenas leucocephala': 'partial',  // White-crowned Pigeon
  'Basilinna leucotis': 'partial',  // White-eared Hummingbird
  'Plegadis chihi': 'partial',  // White-faced Ibis
  'Loxia leucoptera': 'partial',  // White-winged Crossbill
  'Zenaida asiatica': 'partial',  // White-winged Dove
  'Sphyrapicus thyroideus': 'partial',  // Williamson's Sapsucker
  'Gallinago delicata': 'partial',  // Wilson's Snipe
  'Troglodytes hiemalis': 'partial',  // Winter Wren
  'Aix sponsa': 'partial',  // Wood Duck
  'Mycteria americana': 'partial',  // Wood Stork
  'Nyctanassa violacea': 'partial',  // Yellow-crowned Night-Heron
  'Larus livens': 'partial',  // Yellow-footed Gull
  'Buteo albonotatus': 'partial',  // Zone-tailed Hawk
  'Empidonax virescens': 'migratory',  // Acadian Flycatcher
  'Empidonax alnorum': 'migratory',  // Alder Flycatcher
  'Onychoprion aleuticus': 'migratory',  // Aleutian Tern
  'Recurvirostra americana': 'migratory',  // American Avocet
  'Botaurus lentiginosus': 'migratory',  // American Bittern
  'Pluvialis dominica': 'migratory',  // American Golden-Plover
  'Anthus rubescens': 'migratory',  // American Pipit
  'Setophaga ruticilla': 'migratory',  // American Redstart
  'Spizelloides arborea': 'migratory',  // American Tree Sparrow
  'Pelecanus erythrorhynchos': 'migratory',  // American White Pelican
  'Chordeiles gundlachii': 'migratory',  // Antillean Nighthawk
  'Gavia arctica': 'migratory',  // Arctic Loon
  'Sterna paradisaea': 'migratory',  // Arctic Tern
  'Phylloscopus borealis': 'migratory',  // Arctic Warbler
  'Fratercula arctica': 'migratory',  // Atlantic Puffin
  'Calidris bairdii': 'migratory',  // Baird's Sandpiper
  'Centronyx bairdii': 'migratory',  // Baird's Sparrow
  'Icterus galbula': 'migratory',  // Baltimore Oriole
  'Hydrobates castro': 'migratory',  // Band-rumped Storm-Petrel
  'Riparia riparia': 'migratory',  // Bank Swallow
  'Limosa lapponica': 'migratory',  // Bar-tailed Godwit
  'Hirundo rustica': 'migratory',  // Barn Swallow
  'Bucephala islandica': 'migratory',  // Barrow's Goldeneye
  'Setophaga castanea': 'migratory',  // Bay-breasted Warbler
  'Vireo bellii': 'migratory',  // Bell's Vireo
  'Pterodroma cahow': 'migratory',  // Bermuda Petrel
  'Catharus bicknelli': 'migratory',  // Bicknell's Thrush
  'Melanitta americana': 'migratory',  // Black Scoter
  'Hydrobates melania': 'migratory',  // Black Storm-Petrel
  'Cypseloides niger': 'migratory',  // Black Swift
  'Chlidonias niger': 'migratory',  // Black Tern
  'Coccyzus erythropthalmus': 'migratory',  // Black-billed Cuckoo
  'Pterodroma hasitata': 'migratory',  // Black-capped Petrel
  'Vireo atricapilla': 'migratory',  // Black-capped Vireo
  'Archilochus alexandri': 'migratory',  // Black-chinned Hummingbird
  'Pheucticus melanocephalus': 'migratory',  // Black-headed Grosbeak
  'Chroicocephalus ridibundus': 'migratory',  // Black-headed Gull
  'Rissa tridactyla': 'migratory',  // Black-legged Kittiwake
  'Limosa limosa': 'migratory',  // Black-tailed Godwit
  'Setophaga nigrescens': 'migratory',  // Black-throated Gray Warbler
  'Setophaga virens': 'migratory',  // Black-throated Green Warbler
  'Vireo altiloquus': 'migratory',  // Black-whiskered Vireo
  'Pterodroma nigripennis': 'migratory',  // Black-winged Petrel
  'Setophaga fusca': 'migratory',  // Blackburnian Warbler
  'Setophaga striata': 'migratory',  // Blackpoll Warbler
  'Passerina caerulea': 'migratory',  // Blue Grosbeak
  'Vireo solitarius': 'migratory',  // Blue-headed Vireo
  'Spatula discors': 'migratory',  // Blue-winged Teal
  'Vermivora cyanoptera': 'migratory',  // Blue-winged Warbler
  'Cyanecula svecica': 'migratory',  // Bluethroat
  'Dolichonyx oryzivorus': 'migratory',  // Bobolink
  'Bombycilla garrulus': 'migratory',  // Bohemian Waxwing
  'Chroicocephalus philadelphia': 'migratory',  // Bonaparte's Gull
  'Fringilla montifringilla': 'migratory',  // Brambling
  'Branta bernicla': 'migratory',  // Brant
  'Spizella breweri': 'migratory',  // Brewer's Sparrow
  'Onychoprion anaethetus': 'migratory',  // Bridled Tern
  'Numenius tahitiensis': 'migratory',  // Bristle-thighed Curlew
  'Selasphorus platycercus': 'migratory',  // Broad-tailed Hummingbird
  'Buteo platypterus': 'migratory',  // Broad-winged Hawk
  'Myiarchus tyrannulus': 'migratory',  // Brown-crested Flycatcher
  'Calidris subruficollis': 'migratory',  // Buff-breasted Sandpiper
  'Antrostomus ridgwayi': 'migratory',  // Buff-collared Nightjar
  'Ardenna bulleri': 'migratory',  // Buller's Shearwater
  'Icterus bullockii': 'migratory',  // Bullock's Oriole
  'Bulweria bulwerii': 'migratory',  // Bulwer's Petrel
  'Branta hutchinsii': 'migratory',  // Cackling Goose
  'Selasphorus calliope': 'migratory',  // Calliope Hummingbird
  'Aythya valisineria': 'migratory',  // Canvasback
  'Hydroprogne caspia': 'migratory',  // Caspian Tern
  'Vireo cassinii': 'migratory',  // Cassin's Vireo
  'Setophaga cerulea': 'migratory',  // Cerulean Warbler
  'Calcarius ornatus': 'migratory',  // Chestnut-collared Longspur
  'Antrostomus carolinensis': 'migratory',  // Chuck-will's-widow
  'Spatula cyanoptera': 'migratory',  // Cinnamon Teal
  'Spizella pallida': 'migratory',  // Clay-colored Sparrow
  'Leiothlypis crissalis': 'migratory',  // Colima Warbler
  'Cuculus canorus': 'migratory',  // Common Cuckoo
  'Tringa nebularia': 'migratory',  // Common Greenshank
  'Chordeiles minor': 'migratory',  // Common Nighthawk
  'Aythya ferina': 'migratory',  // Common Pochard
  'Acanthis flammea': 'migratory',  // Common Redpoll
  'Charadrius hiaticula': 'migratory',  // Common Ringed Plover
  'Actitis hypoleucos': 'migratory',  // Common Sandpiper
  'Gallinago gallinago': 'migratory',  // Common Snipe
  'Sterna hirundo': 'migratory',  // Common Tern
  'Oporornis agilis': 'migratory',  // Connecticut Warbler
  'Pterodroma cookii': 'migratory',  // Cook's Petrel
  'Empidonax occidentalis': 'migratory',  // Cordilleran Flycatcher
  'Calonectris diomedea': 'migratory',  // Cory's Shearwater
  'Calidris ferruginea': 'migratory',  // Curlew Sandpiper
  'Spiza americana': 'migratory',  // Dickcissel
  'Alle alle': 'migratory',  // Dovekie
  'Calidris alpina': 'migratory',  // Dunlin
  'Empidonax oberholseri': 'migratory',  // Dusky Flycatcher
  'Antrostomus vociferus': 'migratory',  // Eastern Whip-poor-will
  'Contopus virens': 'migratory',  // Eastern Wood-Pewee
  'Motacilla tschutschensis': 'migratory',  // Eastern Yellow Wagtail
  'Micrathene whitneyi': 'migratory',  // Elf Owl
  'Anser canagicus': 'migratory',  // Emperor Goose
  'Mareca penelope': 'migratory',  // Eurasian Wigeon
  'Turdus obscurus': 'migratory',  // Eyebrowed Thrush
  'Pterodroma feae': 'migratory',  // Fea's Petrel
  'Psiloscops flammeolus': 'migratory',  // Flammulated Owl
  'Ardenna carneipes': 'migratory',  // Flesh-footed Shearwater
  'Tyrannus savana': 'migratory',  // Fork-tailed Flycatcher
  'Passerella iliaca': 'migratory',  // Fox Sparrow
  'Leucophaeus pipixcan': 'migratory',  // Franklin's Gull
  'Larus hyperboreus': 'migratory',  // Glaucous Gull
  'Setophaga chrysoparia': 'migratory',  // Golden-cheeked Warbler
  'Zonotrichia atricapilla': 'migratory',  // Golden-crowned Sparrow
  'Vermivora chrysoptera': 'migratory',  // Golden-winged Warbler
  'Setophaga graciae': 'migratory',  // Grace's Warbler
  'Empidonax wrightii': 'migratory',  // Gray Flycatcher
  'Tyrannus dominicensis': 'migratory',  // Gray Kingbird
  'Onychoprion lunatus': 'migratory',  // Gray-backed Tern
  'Catharus minimus': 'migratory',  // Gray-cheeked Thrush
  'Tringa brevipes': 'migratory',  // Gray-tailed Tattler
  'Ardenna gravis': 'migratory',  // Great Shearwater
  'Stercorarius skua': 'migratory',  // Great Skua
  'Contopus pertinax': 'migratory',  // Greater Pewee
  'Aythya marila': 'migratory',  // Greater Scaup
  'Anser albifrons': 'migratory',  // Greater White-fronted Goose
  'Tringa melanoleuca': 'migratory',  // Greater Yellowlegs
  'Pipilo chlorurus': 'migratory',  // Green-tailed Towhee
  'Anas crecca': 'migratory',  // Green-winged Teal
  'Gelochelidon nilotica': 'migratory',  // Gull-billed Tern
  'Empidonax hammondii': 'migratory',  // Hammond's Flycatcher
  'Histrionicus histrionicus': 'migratory',  // Harlequin Duck
  'Zonotrichia querula': 'migratory',  // Harris's Sparrow
  'Setophaga occidentalis': 'migratory',  // Hermit Warbler
  'Acanthis hornemanni': 'migratory',  // Hoary Redpoll
  'Podiceps auritus': 'migratory',  // Horned Grebe
  'Limosa haemastica': 'migratory',  // Hudsonian Godwit
  'Larus glaucoides': 'migratory',  // Iceland Gull
  'Pagophila eburnea': 'migratory',  // Ivory Gull
  'Pterodroma externa': 'migratory',  // Juan Fernandez Petrel
  'Geothlypis formosa': 'migratory',  // Kentucky Warbler
  'Somateria spectabilis': 'migratory',  // King Eider
  'Setophaga kirtlandii': 'migratory',  // Kirtland's Warbler
  'Calcarius lapponicus': 'migratory',  // Lapland Longspur
  'Calamospiza melanocorys': 'migratory',  // Lark Bunting
  'Passerina amoena': 'migratory',  // Lazuli Bunting
  'Ammospiza leconteii': 'migratory',  // LeConte's Sparrow
  'Hydrobates leucorhous': 'migratory',  // Leach's Storm-Petrel
  'Ixobrychus exilis': 'migratory',  // Least Bittern
  'Hydrobates microsoma': 'migratory',  // Least Storm-Petrel
  'Sternula antillarum': 'migratory',  // Least Tern
  'Larus fuscus': 'migratory',  // Lesser Black-backed Gull
  'Chordeiles acutipennis': 'migratory',  // Lesser Nighthawk
  'Anarhynchus mongolus': 'migratory',  // Lesser Sand-Plover
  'Aythya affinis': 'migratory',  // Lesser Scaup
  'Tringa flavipes': 'migratory',  // Lesser Yellowlegs
  'Melospiza lincolnii': 'migratory',  // Lincoln's Sparrow
  'Hydrocoloeus minutus': 'migratory',  // Little Gull
  'Limnodromus scolopaceus': 'migratory',  // Long-billed Dowitcher
  'Brachyramphus perdix': 'migratory',  // Long-billed Murrelet
  'Clangula hyemalis': 'migratory',  // Long-tailed Duck
  'Stercorarius longicaudus': 'migratory',  // Long-tailed Jaeger
  'Calidris subminuta': 'migratory',  // Long-toed Stint
  'Parkesia motacilla': 'migratory',  // Louisiana Waterthrush
  'Calothorax lucifer': 'migratory',  // Lucifer Hummingbird
  'Leiothlypis luciae': 'migratory',  // Lucy's Warbler
  'Geothlypis tolmiei': 'migratory',  // MacGillivray's Warbler
  'Setophaga magnolia': 'migratory',  // Magnolia Warbler
  'Puffinus puffinus': 'migratory',  // Manx Shearwater
  'Plectrophenax hyperboreus': 'migratory',  // McKay's Bunting
  'Antrostomus arizonae': 'migratory',  // Mexican Whip-poor-will
  'Ictinia mississippiensis': 'migratory',  // Mississippi Kite
  'Pterodroma inexpectata': 'migratory',  // Mottled Petrel
  'Anarhynchus montanus': 'migratory',  // Mountain Plover
  'Geothlypis philadelphia': 'migratory',  // Mourning Warbler
  'Pterodroma ultima': 'migratory',  // Murphy's Petrel
  'Leiothlypis ruficapilla': 'migratory',  // Nashville Warbler
  'Ammospiza nelsoni': 'migratory',  // Nelson's Sparrow
  'Puffinus newelli': 'migratory',  // Newell's Shearwater
  'Morus bassanus': 'migratory',  // Northern Gannet
  'Anas acuta': 'migratory',  // Northern Pintail
  'Stelgidopteryx serripennis': 'migratory',  // Northern Rough-winged Swallow
  'Spatula clypeata': 'migratory',  // Northern Shoveler
  'Lanius borealis': 'migratory',  // Northern Shrike
  'Parkesia noveboracensis': 'migratory',  // Northern Waterthrush
  'Oenanthe oenanthe': 'migratory',  // Northern Wheatear
  'Anthus hodgsoni': 'migratory',  // Olive-backed Pipit
  'Contopus cooperi': 'migratory',  // Olive-sided Flycatcher
  'Icterus spurius': 'migratory',  // Orchard Oriole
  'Seiurus aurocapilla': 'migratory',  // Ovenbird
  'Pluvialis fulva': 'migratory',  // Pacific Golden-Plover
  'Gavia pacifica': 'migratory',  // Pacific Loon
  'Empidonax difficilis': 'migratory',  // Pacific-slope Flycatcher
  'Stercorarius parasiticus': 'migratory',  // Parasitic Jaeger
  'Calidris melanotos': 'migratory',  // Pectoral Sandpiper
  'Vireo philadelphicus': 'migratory',  // Philadelphia Vireo
  'Ardenna creatopus': 'migratory',  // Pink-footed Shearwater
  'Stercorarius pomarinus': 'migratory',  // Pomarine Jaeger
  'Setophaga discolor': 'migratory',  // Prairie Warbler
  'Progne subis': 'migratory',  // Purple Martin
  'Calidris maritima': 'migratory',  // Purple Sandpiper
  'Calidris canutus': 'migratory',  // Red Knot
  'Phalaropus fulicarius': 'migratory',  // Red Phalarope
  'Vireo olivaceus': 'migratory',  // Red-eyed Vireo
  'Cardellina rubrifrons': 'migratory',  // Red-faced Warbler
  'Rissa brevirostris': 'migratory',  // Red-legged Kittiwake
  'Podiceps grisegena': 'migratory',  // Red-necked Grebe
  'Phalaropus lobatus': 'migratory',  // Red-necked Phalarope
  'Calidris ruficollis': 'migratory',  // Red-necked Stint
  'Gavia stellata': 'migratory',  // Red-throated Loon
  'Anthus cervinus': 'migratory',  // Red-throated Pipit
  'Aythya americana': 'migratory',  // Redhead
  'Aythya collaris': 'migratory',  // Ring-necked Duck
  'Calidris ptilocnemis': 'migratory',  // Rock Sandpiper
  'Pheucticus ludovicianus': 'migratory',  // Rose-breasted Grosbeak
  'Sterna dougallii': 'migratory',  // Roseate Tern
  'Anser rossii': 'migratory',  // Ross's Goose
  'Rhodostethia rosea': 'migratory',  // Ross's Gull
  'Buteo lagopus': 'migratory',  // Rough-legged Hawk
  'Archilochus colubris': 'migratory',  // Ruby-throated Hummingbird
  'Calidris pugnax': 'migratory',  // Ruff
  'Emberiza rustica': 'migratory',  // Rustic Bunting
  'Euphagus carolinus': 'migratory',  // Rusty Blackbird
  'Xema sabini': 'migratory',  // Sabine's Gull
  'Ammospiza caudacuta': 'migratory',  // Saltmarsh Sparrow
  'Thalasseus sandvicensis': 'migratory',  // Sandwich Tern
  'Piranga olivacea': 'migratory',  // Scarlet Tanager
  'Tyrannus forficatus': 'migratory',  // Scissor-tailed Flycatcher
  'Calidris acuminata': 'migratory',  // Sharp-tailed Sandpiper
  'Larus brachyrhynchus': 'migratory',  // Short-billed Gull
  'Phoebastria albatrus': 'migratory',  // Short-tailed Albatross
  'Ardenna tenuirostris': 'migratory',  // Short-tailed Shearwater
  'Calliope calliope': 'migratory',  // Siberian Rubythroat
  'Larus schistisagus': 'migratory',  // Slaty-backed Gull
  'Mergellus albellus': 'migratory',  // Smew
  'Calcarius pictus': 'migratory',  // Smith's Longspur
  'Plectrophenax nivalis': 'migratory',  // Snow Bunting
  'Anser caerulescens': 'migratory',  // Snow Goose
  'Bubo scandiacus': 'migratory',  // Snowy Owl
  'Tringa solitaria': 'migratory',  // Solitary Sandpiper
  'Ardenna grisea': 'migratory',  // Sooty Shearwater
  'Onychoprion fuscatus': 'migratory',  // Sooty Tern
  'Porzana carolina': 'migratory',  // Sora
  'Stercorarius maccormicki': 'migratory',  // South Polar Skua
  'Somateria fischeri': 'migratory',  // Spectacled Eider
  'Actitis macularius': 'migratory',  // Spotted Sandpiper
  'Anthus spragueii': 'migratory',  // Sprague's Pipit
  'Polysticta stelleri': 'migratory',  // Steller's Eider
  'Calidris himantopus': 'migratory',  // Stilt Sandpiper
  'Myiodynastes luteiventris': 'migratory',  // Sulphur-bellied Flycatcher
  'Melanitta perspicillata': 'migratory',  // Surf Scoter
  'Calidris virgata': 'migratory',  // Surfbird
  'Buteo swainsoni': 'migratory',  // Swainson's Hawk
  'Catharus ustulatus': 'migratory',  // Swainson's Thrush
  'Limnothlypis swainsonii': 'migratory',  // Swainson's Warbler
  'Anser fabalis': 'migratory',  // Taiga Bean-Goose
  'Calidris temminckii': 'migratory',  // Temminck's Stint
  'Leiothlypis peregrina': 'migratory',  // Tennessee Warbler
  'Xenus cinereus': 'migratory',  // Terek Sandpiper
  'Rhynchophanes mccownii': 'migratory',  // Thick-billed Longspur
  'Hydrobates socorroensis': 'migratory',  // Townsend's Storm-Petrel
  'Setophaga townsendi': 'migratory',  // Townsend's Warbler
  'Tachycineta bicolor': 'migratory',  // Tree Swallow
  'Pterodroma arminjoniana': 'migratory',  // Trindade Petrel
  'Hydrobates tristrami': 'migratory',  // Tristram's Storm-Petrel
  'Aythya fuligula': 'migratory',  // Tufted Duck
  'Anser serrirostris': 'migratory',  // Tundra Bean-Goose
  'Cygnus columbianus': 'migratory',  // Tundra Swan
  'Bartramia longicauda': 'migratory',  // Upland Sandpiper
  'Chaetura vauxi': 'migratory',  // Vaux's Swift
  'Catharus fuscescens': 'migratory',  // Veery
  'Pooecetes gramineus': 'migratory',  // Vesper Sparrow
  'Tachycineta thalassina': 'migratory',  // Violet-green Swallow
  'Leiothlypis virginiae': 'migratory',  // Virginia's Warbler
  'Tringa incana': 'migratory',  // Wandering Tattler
  'Vireo gilvus': 'migratory',  // Warbling Vireo
  'Ardenna pacifica': 'migratory',  // Wedge-tailed Shearwater
  'Tyrannus verticalis': 'migratory',  // Western Kingbird
  'Calidris mauri': 'migratory',  // Western Sandpiper
  'Piranga ludoviciana': 'migratory',  // Western Tanager
  'Contopus sordidulus': 'migratory',  // Western Wood-Pewee
  'Numenius phaeopus': 'migratory',  // Whimbrel
  'Motacilla alba': 'migratory',  // White Wagtail
  'Zonotrichia leucophrys': 'migratory',  // White-crowned Sparrow
  'Pelagodroma marina': 'migratory',  // White-faced Storm-Petrel
  'Pterodroma cervicalis': 'migratory',  // White-necked Petrel
  'Calidris fuscicollis': 'migratory',  // White-rumped Sandpiper
  'Melanitta deglandi': 'migratory',  // White-winged Scoter
  'Cygnus cygnus': 'migratory',  // Whooper Swan
  'Grus americana': 'migratory',  // Whooping Crane
  'Empidonax traillii': 'migratory',  // Willow Flycatcher
  'Phalaropus tricolor': 'migratory',  // Wilson's Phalarope
  'Oceanites oceanicus': 'migratory',  // Wilson's Storm-Petrel
  'Cardellina pusilla': 'migratory',  // Wilson's Warbler
  'Tringa glareola': 'migratory',  // Wood Sandpiper
  'Helmitheros vermivorum': 'migratory',  // Worm-eating Warbler
  'Coturnicops noveboracensis': 'migratory',  // Yellow Rail
  'Setophaga petechia': 'migratory',  // Yellow Warbler
  'Empidonax flaviventris': 'migratory',  // Yellow-bellied Flycatcher
  'Coccyzus americanus': 'migratory',  // Yellow-billed Cuckoo
  'Gavia adamsii': 'migratory',  // Yellow-billed Loon
  'Icteria virens': 'migratory',  // Yellow-breasted Chat
  'Vireo flavoviridis': 'migratory',  // Yellow-green Vireo
  'Xanthocephalus xanthocephalus': 'migratory',  // Yellow-headed Blackbird
  'Vireo flavifrons': 'migratory',  // Yellow-throated Vireo
};
const SPECIES_RANGE = {
  // Flat region range (lower-48 + AK/HI), regular occurrence only —
  // year-round, breeding, wintering, or migration passage. Vagrant/rare
  // records excluded. Region ids: pnw cal ak hi sw rm gp sp mw ne se.
  // First pass: the 160 currently-seen species. Verified so that every
  // region the user has actually recorded a sighting in is included.
  'Melozone aberti': ['sw', 'cal'],  // Abert's Towhee
  'Melanerpes formicivorus': ['cal', 'sw', 'pnw'],  // Acorn Woodpecker
  'Selasphorus sasin': ['cal', 'pnw'],  // Allen's Hummingbird
  'Fulica americana': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Coot
  'Corvus brachyrhynchos': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Crow
  'Cinclus mexicanus': ['pnw', 'cal', 'ak', 'sw', 'rm'],  // American Dipper
  'Spinus tristis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Goldfinch
  'Falco sparverius': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Kestrel
  'Turdus migratorius': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se', 'hi'],  // American Robin
  'Mareca americana': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Wigeon
  'Anhinga anhinga': ['sp', 'se'],  // Anhinga
  'Calypte anna': ['pnw', 'cal', 'sw'],  // Anna's Hummingbird
  'Myiarchus cinerascens': ['pnw', 'cal', 'sw', 'rm', 'sp'],  // Ash-throated Flycatcher
  'Haliaeetus leucocephalus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Bald Eagle
  'Strix varia': ['rm', 'gp', 'sp', 'mw', 'ne', 'se', 'pnw'],  // Barred Owl
  'Megaceryle alcyon': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Belted Kingfisher
  'Thryomanes bewickii': ['pnw', 'cal', 'sw', 'rm', 'sp', 'se'],  // Bewick's Wren
  'Sayornis nigricans': ['cal', 'sw', 'sp'],  // Black Phoebe
  'Rynchops niger': ['cal', 'sp', 'se'],  // Black Skimmer
  'Arenaria melanocephala': ['pnw', 'cal', 'ak'],  // Black Turnstone
  'Coragyps atratus': ['sw', 'sp', 'mw', 'ne', 'se'],  // Black Vulture
  'Mniotilta varia': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Black-and-white Warbler
  'Pluvialis squatarola': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se', 'hi'],  // Black-bellied Plover
  'Poecile atricapillus': ['pnw', 'cal', 'ak', 'rm', 'gp', 'mw', 'ne'],  // Black-capped Chickadee
  'Nycticorax nycticorax': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se', 'hi'],  // Black-crowned Night-Heron
  'Setophaga caerulescens': ['mw', 'ne', 'se'],  // Black-throated Blue Warbler
  'Amphispiza bilineata': ['cal', 'sw', 'rm', 'gp', 'sp'],  // Black-throated Sparrow
  'Cyanocitta cristata': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Blue Jay
  'Polioptila caerulea': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Blue-gray Gnatcatcher
  'Quiscalus major': ['se'],  // Boat-tailed Grackle
  'Euphagus cyanocephalus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Brewer's Blackbird
  'Certhia americana': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Brown Creeper
  'Pelecanus occidentalis': ['cal', 'sp', 'se'],  // Brown Pelican
  'Toxostoma rufum': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Brown Thrasher
  'Molothrus ater': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Brown-headed Cowbird
  'Sitta pusilla': ['se'],  // Brown-headed Nuthatch
  'Bucephala albeola': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Bufflehead
  'Psaltriparus minimus': ['pnw', 'cal', 'sw', 'rm', 'sp'],  // Bushtit
  'Campylorhynchus brunneicapillus': ['cal', 'sw', 'sp'],  // Cactus Wren
  'Larus californicus': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // California Gull
  'Aphelocoma californica': ['pnw', 'cal', 'sw'],  // California Scrub-Jay
  'Melozone crissalis': ['cal'],  // California Towhee
  'Branta canadensis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Canada Goose
  'Cardellina canadensis': ['rm', 'gp', 'mw', 'ne', 'se'],  // Canada Warbler
  'Catherpes mexicanus': ['pnw', 'cal', 'sw', 'rm', 'sp'],  // Canyon Wren
  'Setophaga tigrina': ['gp', 'mw', 'ne', 'se'],  // Cape May Warbler
  'Poecile carolinensis': ['sp', 'mw', 'ne', 'se'],  // Carolina Chickadee
  'Thryothorus ludovicianus': ['gp', 'sp', 'mw', 'ne', 'se'],  // Carolina Wren
  'Tyrannus vociferans': ['cal', 'sw', 'rm', 'sp'],  // Cassin's Kingbird
  'Bombycilla cedrorum': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Cedar Waxwing
  'Poecile rufescens': ['pnw', 'cal', 'ak'],  // Chestnut-backed Chickadee
  'Setophaga pensylvanica': ['rm', 'gp', 'mw', 'ne', 'se'],  // Chestnut-sided Warbler
  'Chaetura pelagica': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Chimney Swift
  'Spizella passerina': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Chipping Sparrow
  'Nucifraga columbiana': ['pnw', 'cal', 'sw', 'rm'],  // Clark's Nutcracker
  'Petrochelidon pyrrhonota': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Cliff Swallow
  'Gallinula galeata': ['cal', 'sw', 'sp', 'mw', 'ne', 'se'],  // Common Gallinule
  'Bucephala clangula': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Common Goldeneye
  'Quiscalus quiscula': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Common Grackle
  'Corvus corax': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Common Raven
  'Geothlypis trichas': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Common Yellowthroat
  'Astur cooperii': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Cooper's Hawk
  'Calypte costae': ['cal', 'sw'],  // Costa's Hummingbird
  'Junco hyemalis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Dark-eyed Junco
  'Nannopterum auritum': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Double-crested Cormorant
  'Dryobates pubescens': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Downy Woodpecker
  'Sialia sialis': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Bluebird
  'Tyrannus tyrannus': ['pnw', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Kingbird
  'Sturnella magna': ['sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Meadowlark
  'Sayornis phoebe': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Phoebe
  'Pipilo erythrophthalmus': ['gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Towhee
  'Thalasseus elegans': ['cal'],  // Elegant Tern
  'Corvus ossifragus': ['se', 'ne'],  // Fish Crow
  'Sterna forsteri': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Forster's Tern
  'Plegadis falcinellus': ['ne', 'se'],  // Glossy Ibis
  'Regulus satrapa': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Golden-crowned Kinglet
  'Dumetella carolinensis': ['pnw', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Gray Catbird
  'Ardea herodias': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Great Blue Heron
  'Myiarchus crinitus': ['gp', 'sp', 'mw', 'ne', 'se'],  // Great Crested Flycatcher
  'Ardea alba': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Great Egret
  'Quiscalus mexicanus': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'se'],  // Great-tailed Grackle
  'Dryobates villosus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Hairy Woodpecker
  'Larus heermanni': ['cal', 'pnw'],  // Heermann's Gull
  'Catharus guttatus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Hermit Thrush
  'Lophodytes cucullatus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Hooded Merganser
  'Setophaga citrina': ['sp', 'mw', 'ne', 'se'],  // Hooded Warbler
  'Haemorhous mexicanus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se', 'hi'],  // House Finch
  'Passerina cyanea': ['sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Indigo Bunting
  'Charadrius vociferus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Killdeer
  'Dryobates scalaris': ['cal', 'sw', 'rm', 'gp', 'sp'],  // Ladder-backed Woodpecker
  'Leucophaeus atricilla': ['sp', 'ne', 'se'],  // Laughing Gull
  'Empidonax minimus': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Least Flycatcher
  'Calidris minutilla': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Least Sandpiper
  'Spinus psaltria': ['cal', 'sw', 'rm', 'sp'],  // Lesser Goldfinch
  'Egretta caerulea': ['sw', 'sp', 'mw', 'ne', 'se'],  // Little Blue Heron
  'Numenius americanus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Long-billed Curlew
  'Anas platyrhynchos': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Mallard
  'Limosa fedoa': ['pnw', 'cal', 'ak', 'rm', 'gp', 'sp', 'se'],  // Marbled Godwit
  'Zenaida macroura': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Mourning Dove
  'Cardinalis cardinalis': ['sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Cardinal
  'Colaptes auratus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Flicker
  'Mimus polyglottos': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Mockingbird
  'Setophaga americana': ['sp', 'mw', 'ne', 'se'],  // Northern Parula
  'Dryobates nuttallii': ['cal'],  // Nuttall's Woodpecker
  'Baeolophus inornatus': ['cal', 'pnw'],  // Oak Titmouse
  'Pandion haliaetus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Osprey
  'Troglodytes pacificus': ['pnw', 'cal', 'ak'],  // Pacific Wren
  'Passerina ciris': ['sw', 'sp', 'se'],  // Painted Bunting
  'Setophaga palmarum': ['ak', 'mw', 'ne', 'se'],  // Palm Warbler
  'Urile pelagicus': ['pnw', 'cal', 'ak'],  // Pelagic Cormorant
  'Falco peregrinus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Peregrine Falcon
  'Podilymbus podiceps': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Pied-billed Grebe
  'Dryocopus pileatus': ['pnw', 'cal', 'rm', 'gp', 'mw', 'ne', 'se'],  // Pileated Woodpecker
  'Setophaga pinus': ['sp', 'mw', 'ne', 'se'],  // Pine Warbler
  'Charadrius melodus': ['gp', 'mw', 'ne', 'se'],  // Piping Plover
  'Protonotaria citrea': ['sp', 'mw', 'se'],  // Prothonotary Warbler
  'Haemorhous purpureus': ['pnw', 'cal', 'rm', 'gp', 'mw', 'ne', 'se'],  // Purple Finch
  'Melanerpes carolinus': ['gp', 'sp', 'mw', 'ne', 'se'],  // Red-bellied Woodpecker
  'Mergus serrator': ['pnw', 'cal', 'ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Red-breasted Merganser
  'Melanerpes erythrocephalus': ['gp', 'sp', 'mw', 'ne', 'se'],  // Red-headed Woodpecker
  'Buteo lineatus': ['cal', 'sp', 'mw', 'ne', 'se'],  // Red-shouldered Hawk
  'Buteo jamaicensis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Red-tailed Hawk
  'Agelaius phoeniceus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Red-winged Blackbird
  'Larus delawarensis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Ring-billed Gull
  'Corthylio calendula': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Ruby-crowned Kinglet
  'Oxyura jamaicensis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Ruddy Duck
  'Arenaria interpres': ['pnw', 'cal', 'ak', 'gp', 'sp', 'mw', 'ne', 'se', 'hi'],  // Ruddy Turnstone
  'Selasphorus rufus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'se'],  // Rufous Hummingbird
  'Calidris alba': ['pnw', 'cal', 'ak', 'gp', 'sp', 'mw', 'ne', 'se', 'hi'],  // Sanderling
  'Sayornis saya': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp'],  // Say's Phoebe
  'Charadrius semipalmatus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Semipalmated Plover
  'Calidris pusilla': ['ak', 'gp', 'sp', 'mw', 'ne', 'se'],  // Semipalmated Sandpiper
  'Limnodromus griseus': ['pnw', 'cal', 'ak', 'sp', 'mw', 'ne', 'se'],  // Short-billed Dowitcher
  'Egretta thula': ['pnw', 'cal', 'sw', 'rm', 'sp', 'mw', 'ne', 'se'],  // Snowy Egret
  'Anarhynchus nivosus': ['cal', 'sw', 'sp', 'se'],  // Snowy Plover
  'Melospiza melodia': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Song Sparrow
  'Cyanocitta stelleri': ['pnw', 'cal', 'ak', 'sw', 'rm'],  // Steller's Jay
  'Piranga rubra': ['cal', 'sw', 'gp', 'sp', 'mw', 'se'],  // Summer Tanager
  'Elanoides forficatus': ['sp', 'se'],  // Swallow-tailed Kite
  'Melospiza georgiana': ['rm', 'gp', 'mw', 'ne', 'se'],  // Swamp Sparrow
  'Egretta tricolor': ['sp', 'ne', 'se'],  // Tricolored Heron
  'Baeolophus bicolor': ['gp', 'sp', 'mw', 'ne', 'se'],  // Tufted Titmouse
  'Cathartes aura': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Turkey Vulture
  'Ixoreus naevius': ['pnw', 'cal', 'ak'],  // Varied Thrush
  'Auriparus flaviceps': ['cal', 'sw', 'sp'],  // Verdin
  'Pyrocephalus rubinus': ['cal', 'sw', 'sp'],  // Vermilion Flycatcher
  'Larus occidentalis': ['pnw', 'cal'],  // Western Gull
  'Eudocimus albus': ['sp', 'se'],  // White Ibis
  'Sitta carolinensis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // White-breasted Nuthatch
  'Vireo griseus': ['sp', 'mw', 'ne', 'se'],  // White-eyed Vireo
  'Zonotrichia albicollis': ['cal', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // White-throated Sparrow
  'Aeronautes saxatalis': ['pnw', 'cal', 'sw', 'rm'],  // White-throated Swift
  'Meleagris gallopavo': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Wild Turkey
  'Tringa semipalmata': ['pnw', 'cal', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Willet
  'Anarhynchus wilsonia': ['sp', 'se'],  // Wilson's Plover
  'Hylocichla mustelina': ['gp', 'sp', 'mw', 'ne', 'se'],  // Wood Thrush
  'Chamaea fasciata': ['pnw', 'cal'],  // Wrentit
  'Sphyrapicus varius': ['ak', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Yellow-bellied Sapsucker
  'Setophaga coronata': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Yellow-rumped Warbler
  'Setophaga dominica': ['sp', 'mw', 'se'],  // Yellow-throated Warbler
  // ---- remaining checklist species (regular occurrence, vagrants excluded) ----
  'Empidonax virescens': ['gp', 'sp', 'mw', 'ne', 'se'],  // Acadian Flycatcher
  'Loxops caeruleirostris': ['hi'],  // Akekee
  'Hemignathus wilsoni': ['hi'],  // Akiapolaau
  'Oreomystis bairdi': ['hi'],  // Akikiki
  'Palmeria dolei': ['hi'],  // Akohekohe
  'Empidonax alnorum': ['pnw', 'ak', 'rm', 'gp', 'mw', 'ne'],  // Alder Flycatcher
  'Onychoprion aleuticus': ['ak'],  // Aleutian Tern
  'Icterus gularis': ['sp'],  // Altamira Oriole
  'Recurvirostra americana': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'se'],  // American Avocet
  'Botaurus lentiginosus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Bittern
  'Anas rubripes': ['gp', 'mw', 'ne', 'se'],  // American Black Duck
  'Phoenicopterus ruber': ['se'],  // American Flamingo
  'Pluvialis dominica': ['ak', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Golden-Plover
  'Astur atricapillus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne'],  // American Goshawk
  'Haematopus palliatus': ['cal', 'sp', 'ne', 'se'],  // American Oystercatcher
  'Anthus rubescens': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Pipit
  'Setophaga ruticilla': ['pnw', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // American Redstart
  'Picoides dorsalis': ['pnw', 'ak', 'rm', 'mw', 'ne'],  // American Three-toed Woodpecker
  'Spizelloides arborea': ['ak', 'pnw', 'rm', 'gp', 'mw', 'ne', 'se'],  // American Tree Sparrow
  'Pelecanus erythrorhynchos': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'se'],  // American White Pelican
  'Scolopax minor': ['gp', 'sp', 'mw', 'ne', 'se'],  // American Woodcock
  'Synthliboramphus antiquus': ['pnw', 'cal', 'ak'],  // Ancient Murrelet
  'Magumma parva': ['hi'],  // Anianiau
  'Chordeiles gundlachii': ['se'],  // Antillean Nighthawk
  'Himatione sanguinea': ['hi'],  // Apapane
  'Falco femoralis': ['sw'],  // Aplomado Falcon
  'Gavia arctica': ['ak'],  // Arctic Loon
  'Sterna paradisaea': ['pnw', 'ak', 'ne'],  // Arctic Tern
  'Phylloscopus borealis': ['ak'],  // Arctic Warbler
  'Dryobates arizonae': ['sw'],  // Arizona Woodpecker
  'Hydrobates homochroa': ['cal'],  // Ashy Storm-Petrel
  'Fratercula arctica': ['ne'],  // Atlantic Puffin
  'Icterus graduacauda': ['sp'],  // Audubon's Oriole
  'Puffinus lherminieri': ['se'],  // Audubon's Shearwater
  'Peucaea aestivalis': ['sp', 'se'],  // Bachman's Sparrow
  'Calidris bairdii': ['ak', 'cal', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Baird's Sandpiper
  'Centronyx bairdii': ['rm', 'gp'],  // Baird's Sparrow
  'Icterus galbula': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Baltimore Oriole
  'Hydrobates castro': ['hi', 'se'],  // Band-rumped Storm-Petrel
  'Patagioenas fasciata': ['pnw', 'cal', 'sw', 'rm'],  // Band-tailed Pigeon
  'Riparia riparia': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Bank Swallow
  'Limosa lapponica': ['ak'],  // Bar-tailed Godwit
  'Tyto alba': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Barn Owl
  'Hirundo rustica': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Barn Swallow
  'Bucephala islandica': ['pnw', 'cal', 'ak', 'rm', 'ne'],  // Barrow's Goldeneye
  'Setophaga castanea': ['ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Bay-breasted Warbler
  'Artemisiospiza belli': ['cal'],  // Bell's Sparrow
  'Vireo bellii': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Bell's Vireo
  'Toxostoma bendirei': ['cal', 'sw'],  // Bendire's Thrasher
  'Pterodroma cahow': ['se'],  // Bermuda Petrel
  'Saucerottia beryllina': ['sw'],  // Berylline Hummingbird
  'Catharus bicknelli': ['ne'],  // Bicknell's Thrush
  'Cepphus grylle': ['ak', 'ne'],  // Black Guillemot
  'Anous minutus': ['hi'],  // Black Noddy
  'Haematopus bachmani': ['pnw', 'cal', 'ak'],  // Black Oystercatcher
  'Laterallus jamaicensis': ['cal', 'sp', 'ne', 'se'],  // Black Rail
  'Leucosticte atrata': ['rm'],  // Black Rosy-Finch
  'Melanitta americana': ['pnw', 'cal', 'ak', 'ne', 'se'],  // Black Scoter
  'Hydrobates melania': ['cal'],  // Black Storm-Petrel
  'Cypseloides niger': ['pnw', 'cal', 'sw', 'rm'],  // Black Swift
  'Chlidonias niger': ['pnw', 'cal', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Black Tern
  'Picoides arcticus': ['pnw', 'cal', 'ak', 'rm', 'mw', 'ne'],  // Black-backed Woodpecker
  'Dendrocygna autumnalis': ['cal', 'sw', 'sp', 'se'],  // Black-bellied Whistling-Duck
  'Coccyzus erythropthalmus': ['rm', 'gp', 'mw', 'ne', 'se'],  // Black-billed Cuckoo
  'Pica hudsonia': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp'],  // Black-billed Magpie
  'Polioptila nigriceps': ['sw'],  // Black-capped Gnatcatcher
  'Pterodroma hasitata': ['se'],  // Black-capped Petrel
  'Vireo atricapilla': ['sw', 'sp'],  // Black-capped Vireo
  'Archilochus alexandri': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Black-chinned Hummingbird
  'Spizella atrogularis': ['cal', 'sw'],  // Black-chinned Sparrow
  'Baeolophus atricristatus': ['sp'],  // Black-crested Titmouse
  'Phoebastria nigripes': ['pnw', 'cal', 'ak', 'hi'],  // Black-footed Albatross
  'Pheucticus melanocephalus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Black-headed Grosbeak
  'Chroicocephalus ridibundus': ['ak', 'ne'],  // Black-headed Gull
  'Rissa tridactyla': ['pnw', 'cal', 'ak', 'ne'],  // Black-legged Kittiwake
  'Himantopus mexicanus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'se'],  // Black-necked Stilt
  'Polioptila melanura': ['cal', 'sw', 'sp'],  // Black-tailed Gnatcatcher
  'Limosa limosa': ['ak'],  // Black-tailed Godwit
  'Setophaga nigrescens': ['pnw', 'cal', 'sw', 'rm'],  // Black-throated Gray Warbler
  'Setophaga virens': ['rm', 'gp', 'mw', 'ne', 'se'],  // Black-throated Green Warbler
  'Puffinus opisthomelas': ['cal'],  // Black-vented Shearwater
  'Vireo altiloquus': ['se'],  // Black-whiskered Vireo
  'Pterodroma nigripennis': ['cal'],  // Black-winged Petrel
  'Setophaga fusca': ['rm', 'gp', 'mw', 'ne', 'se'],  // Blackburnian Warbler
  'Setophaga striata': ['ak', 'pnw', 'rm', 'mw', 'ne', 'se'],  // Blackpoll Warbler
  'Passerina caerulea': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Blue Grosbeak
  'Anous ceruleus': ['hi'],  // Blue-gray Noddy
  'Vireo solitarius': ['rm', 'gp', 'mw', 'ne', 'se'],  // Blue-headed Vireo
  'Lampornis clemenciae': ['sw'],  // Blue-throated Mountain-gem
  'Spatula discors': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Blue-winged Teal
  'Vermivora cyanoptera': ['gp', 'sp', 'mw', 'ne', 'se'],  // Blue-winged Warbler
  'Cyanecula svecica': ['ak'],  // Bluethroat
  'Dolichonyx oryzivorus': ['pnw', 'rm', 'gp', 'mw', 'ne'],  // Bobolink
  'Bombycilla garrulus': ['ak', 'pnw', 'rm', 'gp', 'mw', 'ne'],  // Bohemian Waxwing
  'Chroicocephalus philadelphia': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Bonaparte's Gull
  'Pterodroma hypoleuca': ['hi'],  // Bonin Petrel
  'Poecile hudsonicus': ['ak', 'pnw', 'rm', 'mw', 'ne'],  // Boreal Chickadee
  'Aegolius funereus': ['ak', 'rm', 'mw'],  // Boreal Owl
  'Peucaea botterii': ['sw', 'sp'],  // Botteri's Sparrow
  'Fringilla montifringilla': ['ak'],  // Brambling
  'Urile penicillatus': ['pnw', 'cal', 'ak'],  // Brandt's Cormorant
  'Branta bernicla': ['pnw', 'cal', 'ak', 'ne', 'se'],  // Brant
  'Spizella breweri': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Brewer's Sparrow
  'Onychoprion anaethetus': ['se'],  // Bridled Tern
  'Baeolophus wollweberi': ['sw'],  // Bridled Titmouse
  'Numenius tahitiensis': ['ak', 'hi'],  // Bristle-thighed Curlew
  'Cynanthus latirostris': ['sw'],  // Broad-billed Hummingbird
  'Selasphorus platycercus': ['sw', 'rm', 'gp'],  // Broad-tailed Hummingbird
  'Buteo platypterus': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Broad-winged Hawk
  'Molothrus aeneus': ['sw', 'sp', 'se'],  // Bronzed Cowbird
  'Sula leucogaster': ['hi', 'se'],  // Brown Booby
  'Anous stolidus': ['hi', 'se'],  // Brown Noddy
  'Leucosticte australis': ['rm'],  // Brown-capped Rosy-Finch
  'Myiarchus tyrannulus': ['cal', 'sw', 'sp'],  // Brown-crested Flycatcher
  'Amazilia yucatanensis': ['sp'],  // Buff-bellied Hummingbird
  'Empidonax fulvifrons': ['sw'],  // Buff-breasted Flycatcher
  'Calidris subruficollis': ['ak', 'gp', 'sp', 'mw'],  // Buff-breasted Sandpiper
  'Antrostomus ridgwayi': ['sw'],  // Buff-collared Nightjar
  'Ardenna bulleri': ['pnw', 'cal'],  // Buller's Shearwater
  'Icterus bullockii': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Bullock's Oriole
  'Bulweria bulwerii': ['hi'],  // Bulwer's Petrel
  'Athene cunicularia': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'se'],  // Burrowing Owl
  'Branta hutchinsii': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Cackling Goose
  'Gymnogyps californianus': ['cal', 'sw'],  // California Condor
  'Polioptila californica': ['cal'],  // California Gnatcatcher
  'Callipepla californica': ['pnw', 'cal', 'sw'],  // California Quail
  'Toxostoma redivivum': ['cal'],  // California Thrasher
  'Selasphorus calliope': ['pnw', 'cal', 'sw', 'rm'],  // Calliope Hummingbird
  'Perisoreus canadensis': ['pnw', 'cal', 'ak', 'rm', 'mw', 'ne'],  // Canada Jay
  'Aythya valisineria': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Canvasback
  'Melozone fusca': ['cal', 'sw', 'rm', 'gp'],  // Canyon Towhee
  'Hydroprogne caspia': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Caspian Tern
  'Loxia sinesciuris': ['rm'],  // Cassia Crossbill
  'Ptychoramphus aleuticus': ['pnw', 'cal', 'ak'],  // Cassin's Auklet
  'Haemorhous cassinii': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Cassin's Finch
  'Peucaea cassinii': ['sw', 'gp', 'sp'],  // Cassin's Sparrow
  'Vireo cassinii': ['pnw', 'cal', 'sw', 'rm'],  // Cassin's Vireo
  'Bubulcus ibis': ['cal', 'sw', 'sp', 'mw', 'ne', 'se'],  // Cattle Egret
  'Petrochelidon fulva': ['sw', 'sp', 'se'],  // Cave Swallow
  'Setophaga cerulea': ['gp', 'sp', 'mw', 'ne', 'se'],  // Cerulean Warbler
  'Calcarius ornatus': ['rm', 'gp', 'sp'],  // Chestnut-collared Longspur
  'Corvus cryptoleucus': ['sw', 'rm', 'gp', 'sp'],  // Chihuahuan Raven
  'Puffinus nativitatis': ['hi'],  // Christmas Shearwater
  'Antrostomus carolinensis': ['sp', 'mw', 'ne', 'se'],  // Chuck-will's-widow
  'Spatula cyanoptera': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Cinnamon Teal
  'Rallus crepitans': ['ne', 'se'],  // Clapper Rail
  'Aechmophorus clarkii': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Clark's Grebe
  'Spizella pallida': ['ak', 'rm', 'gp', 'mw'],  // Clay-colored Sparrow
  'Turdus grayi': ['sp'],  // Clay-colored Thrush
  'Leiothlypis crissalis': ['sw'],  // Colima Warbler
  'Buteogallus anthracinus': ['sw'],  // Common Black Hawk
  'Cuculus canorus': ['ak'],  // Common Cuckoo
  'Somateria mollissima': ['ak', 'ne'],  // Common Eider
  'Tringa nebularia': ['ak'],  // Common Greenshank
  'Columbina passerina': ['cal', 'sw', 'sp', 'se'],  // Common Ground Dove
  'Gavia immer': ['pnw', 'cal', 'ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Common Loon
  'Mergus merganser': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Common Merganser
  'Uria aalge': ['pnw', 'cal', 'ak', 'ne'],  // Common Murre
  'Chordeiles minor': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Common Nighthawk
  'Nyctidromus albicollis': ['sp'],  // Common Pauraque
  'Aythya ferina': ['ak'],  // Common Pochard
  'Phalaenoptilus nuttallii': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Common Poorwill
  'Acanthis flammea': ['ak', 'pnw', 'rm', 'gp', 'mw', 'ne'],  // Common Redpoll
  'Charadrius hiaticula': ['ak'],  // Common Ringed Plover
  'Actitis hypoleucos': ['ak'],  // Common Sandpiper
  'Gallinago gallinago': ['ak'],  // Common Snipe
  'Sterna hirundo': ['pnw', 'cal', 'gp', 'mw', 'ne', 'se'],  // Common Tern
  'Oporornis agilis': ['rm', 'gp', 'mw', 'ne'],  // Connecticut Warbler
  'Pterodroma cookii': ['cal'],  // Cook's Petrel
  'Empidonax occidentalis': ['sw', 'rm'],  // Cordilleran Flycatcher
  'Calonectris diomedea': ['ne', 'se'],  // Cory's Shearwater
  'Tyrannus couchii': ['sp'],  // Couch's Kingbird
  'Synthliboramphus craveri': ['cal'],  // Craveri's Murrelet
  'Aethia cristatella': ['ak'],  // Crested Auklet
  'Caracara cheriway': ['cal', 'sw', 'sp', 'se'],  // Crested Caracara
  'Toxostoma crissale': ['cal', 'sw'],  // Crissal Thrasher
  'Calidris ferruginea': ['ak'],  // Curlew Sandpiper
  'Toxostoma curvirostre': ['sw', 'sp'],  // Curve-billed Thrasher
  'Spiza americana': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Dickcissel
  'Alle alle': ['ne'],  // Dovekie
  'Calidris alpina': ['pnw', 'cal', 'ak', 'gp', 'sp', 'mw', 'ne', 'se'],  // Dunlin
  'Empidonax oberholseri': ['pnw', 'cal', 'sw', 'rm'],  // Dusky Flycatcher
  'Dendragapus obscurus': ['pnw', 'sw', 'rm'],  // Dusky Grouse
  'Myiarchus tuberculifer': ['sw'],  // Dusky-capped Flycatcher
  'Podiceps nigricollis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eared Grebe
  'Megascops asio': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Screech-Owl
  'Antrostomus vociferus': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Whip-poor-will
  'Contopus virens': ['gp', 'sp', 'mw', 'ne', 'se'],  // Eastern Wood-Pewee
  'Motacilla tschutschensis': ['ak'],  // Eastern Yellow Wagtail
  'Trogon elegans': ['sw'],  // Elegant Trogon
  'Micrathene whitneyi': ['sw'],  // Elf Owl
  'Anser canagicus': ['ak'],  // Emperor Goose
  'Mareca penelope': ['pnw', 'cal', 'ak', 'ne'],  // Eurasian Wigeon
  'Coccothraustes vespertinus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne'],  // Evening Grosbeak
  'Turdus obscurus': ['ak'],  // Eyebrowed Thrush
  'Pterodroma feae': ['ne'],  // Fea's Petrel
  'Buteo regalis': ['cal', 'sw', 'rm', 'gp', 'sp'],  // Ferruginous Hawk
  'Glaucidium brasilianum': ['sw', 'sp'],  // Ferruginous Pygmy-Owl
  'Spizella pusilla': ['gp', 'sp', 'mw', 'ne', 'se'],  // Field Sparrow
  'Amphispiza quinquestriata': ['sw'],  // Five-striped Sparrow
  'Piranga bidentata': ['sw'],  // Flame-colored Tanager
  'Psiloscops flammeolus': ['pnw', 'cal', 'sw', 'rm'],  // Flammulated Owl
  'Ardenna carneipes': ['pnw', 'cal'],  // Flesh-footed Shearwater
  'Aphelocoma coerulescens': ['se'],  // Florida Scrub-Jay
  'Tyrannus savana': ['se'],  // Fork-tailed Flycatcher
  'Hydrobates furcatus': ['pnw', 'cal', 'ak'],  // Fork-tailed Storm-Petrel
  'Passerella iliaca': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Fox Sparrow
  'Leucophaeus pipixcan': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Franklin's Gull
  'Dendrocygna bicolor': ['cal', 'sp', 'se'],  // Fulvous Whistling-Duck
  'Mareca strepera': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Gadwall
  'Callipepla gambelii': ['cal', 'sw', 'sp'],  // Gambel's Quail
  'Melanerpes uropygialis': ['sw'],  // Gila Woodpecker
  'Colaptes chrysoides': ['sw'],  // Gilded Flicker
  'Larus hyperboreus': ['pnw', 'cal', 'ak', 'gp', 'mw', 'ne', 'se'],  // Glaucous Gull
  'Larus glaucescens': ['pnw', 'cal', 'ak'],  // Glaucous-winged Gull
  'Aquila chrysaetos': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Golden Eagle
  'Setophaga chrysoparia': ['sp'],  // Golden-cheeked Warbler
  'Zonotrichia atricapilla': ['pnw', 'cal', 'ak', 'sw', 'rm'],  // Golden-crowned Sparrow
  'Melanerpes aurifrons': ['sw', 'sp'],  // Golden-fronted Woodpecker
  'Vermivora chrysoptera': ['gp', 'mw', 'ne', 'se'],  // Golden-winged Warbler
  'Setophaga graciae': ['sw', 'rm'],  // Grace's Warbler
  'Ammodramus savannarum': ['cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Grasshopper Sparrow
  'Empidonax wrightii': ['cal', 'sw', 'rm', 'gp'],  // Gray Flycatcher
  'Buteo plagiatus': ['sw', 'sp'],  // Gray Hawk
  'Tyrannus dominicensis': ['se'],  // Gray Kingbird
  'Vireo vicinior': ['cal', 'sw', 'rm'],  // Gray Vireo
  'Onychoprion lunatus': ['hi'],  // Gray-backed Tern
  'Catharus minimus': ['ak', 'ne'],  // Gray-cheeked Thrush
  'Leucosticte tephrocotis': ['pnw', 'cal', 'ak', 'rm'],  // Gray-crowned Rosy-Finch
  'Poecile cinctus': ['ak'],  // Gray-headed Chickadee
  'Tringa brevipes': ['ak'],  // Gray-tailed Tattler
  'Larus marinus': ['gp', 'mw', 'ne', 'se'],  // Great Black-backed Gull
  'Phalacrocorax carbo': ['ne'],  // Great Cormorant
  'Fregata minor': ['hi'],  // Great Frigatebird
  'Strix nebulosa': ['pnw', 'ak', 'rm', 'mw'],  // Great Gray Owl
  'Bubo virginianus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Great Horned Owl
  'Pitangus sulphuratus': ['sp'],  // Great Kiskadee
  'Ardenna gravis': ['ne', 'se'],  // Great Shearwater
  'Stercorarius skua': ['ne'],  // Great Skua
  'Contopus pertinax': ['sw'],  // Greater Pewee
  'Tympanuchus cupido': ['gp', 'mw'],  // Greater Prairie-Chicken
  'Geococcyx californianus': ['cal', 'sw', 'rm', 'gp', 'sp'],  // Greater Roadrunner
  'Centrocercus urophasianus': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Greater Sage-Grouse
  'Aythya marila': ['pnw', 'cal', 'ak', 'gp', 'mw', 'ne', 'se'],  // Greater Scaup
  'Anser albifrons': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Greater White-fronted Goose
  'Tringa melanoleuca': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Greater Yellowlegs
  'Butorides virescens': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Green Heron
  'Cyanocorax yncas': ['sp'],  // Green Jay
  'Chloroceryle americana': ['sw', 'sp'],  // Green Kingfisher
  'Pipilo chlorurus': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Green-tailed Towhee
  'Anas crecca': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Green-winged Teal
  'Crotophaga sulcirostris': ['sw', 'sp'],  // Groove-billed Ani
  'Synthliboramphus hypoleucus': ['cal'],  // Guadalupe Murrelet
  'Gelochelidon nilotica': ['cal', 'sp', 'ne', 'se'],  // Gull-billed Tern
  'Centrocercus minimus': ['rm'],  // Gunnison Sage-Grouse
  'Falco rusticolus': ['ak', 'pnw', 'rm', 'mw', 'ne'],  // Gyrfalcon
  'Empidonax hammondii': ['pnw', 'cal', 'ak', 'sw', 'rm'],  // Hammond's Flycatcher
  'Histrionicus histrionicus': ['pnw', 'cal', 'ak', 'rm', 'ne'],  // Harlequin Duck
  'Parabuteo unicinctus': ['cal', 'sw', 'sp'],  // Harris's Hawk
  'Zonotrichia querula': ['gp', 'sp', 'mw'],  // Harris's Sparrow
  'Loxops coccineus': ['hi'],  // Hawaii Akepa
  'Chlorodrepanis virens': ['hi'],  // Hawaii Amakihi
  'Loxops mana': ['hi'],  // Hawaii Creeper
  'Chasiempis sandwichensis': ['hi'],  // Hawaii Elepaio
  'Fulica alai': ['hi'],  // Hawaiian Coot
  'Anas wyvilliana': ['hi'],  // Hawaiian Duck
  'Branta sandvicensis': ['hi'],  // Hawaiian Goose
  'Buteo solitarius': ['hi'],  // Hawaiian Hawk
  'Pterodroma sandwichensis': ['hi'],  // Hawaiian Petrel
  'Centronyx henslowii': ['gp', 'mw', 'ne', 'se'],  // Henslow's Sparrow
  'Piranga flava': ['sw'],  // Hepatic Tanager
  'Setophaga occidentalis': ['pnw', 'cal'],  // Hermit Warbler
  'Larus argentatus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Herring Gull
  'Acanthis hornemanni': ['ak'],  // Hoary Redpoll
  'Icterus cucullatus': ['cal', 'sw', 'sp'],  // Hooded Oriole
  'Chondrohierax uncinatus': ['sp'],  // Hook-billed Kite
  'Podiceps auritus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Horned Grebe
  'Eremophila alpestris': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Horned Lark
  'Fratercula corniculata': ['pnw', 'ak'],  // Horned Puffin
  'Troglodytes aedon': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // House Wren
  'Limosa haemastica': ['ak', 'gp', 'mw', 'ne', 'se'],  // Hudsonian Godwit
  'Vireo huttoni': ['pnw', 'cal', 'sw'],  // Hutton's Vireo
  'Larus glaucoides': ['ak', 'mw', 'ne'],  // Iceland Gull
  'Drepanis coccinea': ['hi'],  // Iiwi
  'Columbina inca': ['cal', 'sw', 'rm', 'gp', 'sp', 'se'],  // Inca Dove
  'Aphelocoma insularis': ['cal'],  // Island Scrub-Jay
  'Pagophila eburnea': ['ak'],  // Ivory Gull
  'Pterodroma externa': ['cal'],  // Juan Fernandez Petrel
  'Baeolophus ridgwayi': ['cal', 'sw', 'rm'],  // Juniper Titmouse
  'Chlorodrepanis stejnegeri': ['hi'],  // Kauai Amakihi
  'Chasiempis sclateri': ['hi'],  // Kauai Elepaio
  'Geothlypis formosa': ['gp', 'sp', 'mw', 'ne', 'se'],  // Kentucky Warbler
  'Somateria spectabilis': ['ak', 'ne'],  // King Eider
  'Rallus elegans': ['sp', 'mw', 'ne', 'se'],  // King Rail
  'Setophaga kirtlandii': ['mw', 'se'],  // Kirtland's Warbler
  'Brachyramphus brevirostris': ['ak'],  // Kittlitz's Murrelet
  'Myiarchus sagrae': ['se'],  // La Sagra's Flycatcher
  'Calcarius lapponicus': ['ak', 'pnw', 'cal', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Lapland Longspur
  'Calamospiza melanocorys': ['sw', 'rm', 'gp', 'sp'],  // Lark Bunting
  'Chondestes grammacus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Lark Sparrow
  'Spinus lawrencei': ['cal', 'sw'],  // Lawrence's Goldfinch
  'Phoebastria immutabilis': ['cal', 'hi', 'ak'],  // Laysan Albatross
  'Anas laysanensis': ['hi'],  // Laysan Duck
  'Telespiza cantans': ['hi'],  // Laysan Finch
  'Passerina amoena': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Lazuli Bunting
  'Ammospiza leconteii': ['gp', 'sp', 'mw', 'ne', 'se'],  // LeConte's Sparrow
  'Toxostoma lecontei': ['cal', 'sw'],  // LeConte's Thrasher
  'Hydrobates leucorhous': ['pnw', 'cal', 'ak', 'ne'],  // Leach's Storm-Petrel
  'Aethia pusilla': ['ak'],  // Least Auklet
  'Ixobrychus exilis': ['cal', 'sp', 'mw', 'ne', 'se'],  // Least Bittern
  'Tachybaptus dominicus': ['sw', 'sp', 'se'],  // Least Grebe
  'Hydrobates microsoma': ['cal'],  // Least Storm-Petrel
  'Sternula antillarum': ['cal', 'sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Least Tern
  'Larus fuscus': ['gp', 'mw', 'ne', 'se'],  // Lesser Black-backed Gull
  'Chordeiles acutipennis': ['cal', 'sw', 'sp'],  // Lesser Nighthawk
  'Tympanuchus pallidicinctus': ['sw', 'gp', 'sp'],  // Lesser Prairie-Chicken
  'Anarhynchus mongolus': ['ak'],  // Lesser Sand-Plover
  'Aythya affinis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Lesser Scaup
  'Tringa flavipes': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Lesser Yellowlegs
  'Melanerpes lewis': ['pnw', 'cal', 'sw', 'rm'],  // Lewis's Woodpecker
  'Aramus guarauna': ['se'],  // Limpkin
  'Melospiza lincolnii': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Lincoln's Sparrow
  'Hydrocoloeus minutus': ['mw', 'ne'],  // Little Gull
  'Lanius ludovicianus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Loggerhead Shrike
  'Limnodromus scolopaceus': ['pnw', 'cal', 'ak', 'sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Long-billed Dowitcher
  'Brachyramphus perdix': ['pnw', 'cal', 'ak'],  // Long-billed Murrelet
  'Toxostoma longirostre': ['sp'],  // Long-billed Thrasher
  'Asio otus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne'],  // Long-eared Owl
  'Clangula hyemalis': ['pnw', 'cal', 'ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Long-tailed Duck
  'Stercorarius longicaudus': ['pnw', 'cal', 'ak'],  // Long-tailed Jaeger
  'Calidris subminuta': ['ak'],  // Long-toed Stint
  'Parkesia motacilla': ['sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Louisiana Waterthrush
  'Calothorax lucifer': ['sw'],  // Lucifer Hummingbird
  'Leiothlypis luciae': ['sw'],  // Lucy's Warbler
  'Geothlypis tolmiei': ['pnw', 'cal', 'ak', 'sw', 'rm'],  // MacGillivray's Warbler
  'Fregata magnificens': ['cal', 'sp', 'se'],  // Magnificent Frigatebird
  'Setophaga magnolia': ['ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Magnolia Warbler
  'Coccyzus minor': ['se'],  // Mangrove Cuckoo
  'Puffinus puffinus': ['ne', 'se'],  // Manx Shearwater
  'Brachyramphus marmoratus': ['pnw', 'cal', 'ak'],  // Marbled Murrelet
  'Aerodramus bartschi': ['hi'],  // Mariana Swiftlet
  'Cistothorus palustris': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Marsh Wren
  'Sula dactylatra': ['hi', 'se'],  // Masked Booby
  'Nomonyx dominicus': ['sp', 'se'],  // Masked Duck
  'Paroreomyza montana': ['hi'],  // Maui Alauahio
  'Pseudonestor xanthophrys': ['hi'],  // Maui Parrotbill
  'Plectrophenax hyperboreus': ['ak'],  // McKay's Bunting
  'Falco columbarius': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Merlin
  'Poecile sclateri': ['sw'],  // Mexican Chickadee
  'Anas diazi': ['sw', 'sp'],  // Mexican Duck
  'Aphelocoma wollweberi': ['sw'],  // Mexican Jay
  'Colibri thalassinus': ['sw', 'sp'],  // Mexican Violetear
  'Antrostomus arizonae': ['sw'],  // Mexican Whip-poor-will
  'Acrocephalus familiaris': ['hi'],  // Millerbird
  'Ictinia mississippiensis': ['sw', 'gp', 'sp', 'mw', 'se'],  // Mississippi Kite
  'Cyrtonyx montezumae': ['sw', 'sp'],  // Montezuma Quail
  'Sporophila morelleti': ['sp'],  // Morelet's Seedeater
  'Anas fulvigula': ['sp', 'se'],  // Mottled Duck
  'Pterodroma inexpectata': ['pnw', 'cal', 'ak'],  // Mottled Petrel
  'Sialia currucoides': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp'],  // Mountain Bluebird
  'Poecile gambeli': ['pnw', 'cal', 'sw', 'rm'],  // Mountain Chickadee
  'Anarhynchus montanus': ['cal', 'sw', 'rm', 'gp', 'sp'],  // Mountain Plover
  'Oreortyx pictus': ['pnw', 'cal', 'sw'],  // Mountain Quail
  'Geothlypis philadelphia': ['rm', 'gp', 'mw', 'ne'],  // Mourning Warbler
  'Pterodroma ultima': ['cal'],  // Murphy's Petrel
  'Cairina moschata': ['sp'],  // Muscovy Duck
  'Leiothlypis ruficapilla': ['pnw', 'cal', 'rm', 'gp', 'mw', 'ne', 'se'],  // Nashville Warbler
  'Ammospiza nelsoni': ['ak', 'gp', 'mw', 'ne', 'se'],  // Nelson's Sparrow
  'Nannopterum brasilianum': ['cal', 'sw', 'sp', 'se'],  // Neotropic Cormorant
  'Puffinus newelli': ['hi'],  // Newell's Shearwater
  'Telespiza ultima': ['hi'],  // Nihoa Finch
  'Camptostoma imberbe': ['sw', 'sp'],  // Northern Beardless-Tyrannulet
  'Colinus virginianus': ['sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Bobwhite
  'Fulmarus glacialis': ['pnw', 'cal', 'ak', 'ne'],  // Northern Fulmar
  'Morus bassanus': ['ne', 'se'],  // Northern Gannet
  'Circus hudsonius': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Harrier
  'Surnia ulula': ['ak', 'pnw', 'rm', 'mw', 'ne'],  // Northern Hawk Owl
  'Anas acuta': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Pintail
  'Glaucidium gnoma': ['pnw', 'cal', 'sw', 'rm'],  // Northern Pygmy-Owl
  'Stelgidopteryx serripennis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Rough-winged Swallow
  'Aegolius acadicus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Northern Saw-whet Owl
  'Spatula clypeata': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Northern Shoveler
  'Lanius borealis': ['ak', 'pnw', 'rm', 'gp', 'mw', 'ne'],  // Northern Shrike
  'Parkesia noveboracensis': ['pnw', 'ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Northern Waterthrush
  'Oenanthe oenanthe': ['ak'],  // Northern Wheatear
  'Chlorodrepanis flava': ['hi'],  // Oahu Amakihi
  'Chasiempis ibidis': ['hi'],  // Oahu Elepaio
  'Arremonops rufivirgatus': ['sp'],  // Olive Sparrow
  'Peucedramus taeniatus': ['sw'],  // Olive Warbler
  'Anthus hodgsoni': ['ak'],  // Olive-backed Pipit
  'Contopus cooperi': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne'],  // Olive-sided Flycatcher
  'Myadestes obscurus': ['hi'],  // Omao
  'Leiothlypis celata': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Orange-crowned Warbler
  'Icterus spurius': ['sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Orchard Oriole
  'Seiurus aurocapilla': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Ovenbird
  'Pluvialis fulva': ['ak', 'cal', 'hi'],  // Pacific Golden-Plover
  'Gavia pacifica': ['pnw', 'cal', 'ak'],  // Pacific Loon
  'Empidonax difficilis': ['pnw', 'cal', 'ak', 'sw'],  // Pacific-slope Flycatcher
  'Myioborus pictus': ['sw'],  // Painted Redstart
  'Loxioides bailleui': ['hi'],  // Palila
  'Aethia psittacula': ['ak'],  // Parakeet Auklet
  'Stercorarius parasiticus': ['pnw', 'cal', 'ak', 'ne', 'se'],  // Parasitic Jaeger
  'Calidris melanotos': ['pnw', 'cal', 'ak', 'gp', 'sp', 'mw', 'ne', 'se'],  // Pectoral Sandpiper
  'Phainopepla nitens': ['cal', 'sw', 'sp'],  // Phainopepla
  'Vireo philadelphicus': ['rm', 'gp', 'mw', 'ne'],  // Philadelphia Vireo
  'Cepphus columba': ['pnw', 'cal', 'ak'],  // Pigeon Guillemot
  'Pinicola enucleator': ['ak', 'pnw', 'cal', 'rm', 'mw', 'ne'],  // Pine Grosbeak
  'Spinus pinus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Pine Siskin
  'Ardenna creatopus': ['pnw', 'cal'],  // Pink-footed Shearwater
  'Gymnorhinus cyanocephalus': ['cal', 'sw', 'rm', 'gp'],  // Pinyon Jay
  'Ortalis vetula': ['sp'],  // Plain Chachalaca
  'Vireo plumbeus': ['sw', 'rm', 'gp'],  // Plumbeous Vireo
  'Stercorarius pomarinus': ['pnw', 'cal', 'ak', 'ne', 'se'],  // Pomarine Jaeger
  'Falco mexicanus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Prairie Falcon
  'Setophaga discolor': ['gp', 'sp', 'mw', 'ne', 'se'],  // Prairie Warbler
  'Myadestes palmeri': ['hi'],  // Puaiohi
  'Porphyrio martinicus': ['sp', 'se'],  // Purple Gallinule
  'Progne subis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Purple Martin
  'Calidris maritima': ['ne', 'se'],  // Purple Sandpiper
  'Sitta pygmaea': ['pnw', 'cal', 'sw', 'rm'],  // Pygmy Nuthatch
  'Cardinalis sinuatus': ['cal', 'sw', 'sp'],  // Pyrrhuloxia
  'Alca torda': ['ne'],  // Razorbill
  'Loxia curvirostra': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Red Crossbill
  'Calidris canutus': ['pnw', 'cal', 'ak', 'gp', 'ne', 'se'],  // Red Knot
  'Phalaropus fulicarius': ['pnw', 'cal', 'ak'],  // Red Phalarope
  'Patagioenas flavirostris': ['sp'],  // Red-billed Pigeon
  'Phaethon aethereus': ['cal', 'hi'],  // Red-billed Tropicbird
  'Sitta canadensis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Red-breasted Nuthatch
  'Sphyrapicus ruber': ['pnw', 'cal'],  // Red-breasted Sapsucker
  'Dryobates borealis': ['sp', 'se'],  // Red-cockaded Woodpecker
  'Vireo olivaceus': ['pnw', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Red-eyed Vireo
  'Urile urile': ['ak'],  // Red-faced Cormorant
  'Cardellina rubrifrons': ['sw'],  // Red-faced Warbler
  'Sula sula': ['hi'],  // Red-footed Booby
  'Rissa brevirostris': ['ak'],  // Red-legged Kittiwake
  'Sphyrapicus nuchalis': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Red-naped Sapsucker
  'Podiceps grisegena': ['pnw', 'cal', 'ak', 'gp', 'mw', 'ne', 'se'],  // Red-necked Grebe
  'Phalaropus lobatus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp'],  // Red-necked Phalarope
  'Calidris ruficollis': ['ak'],  // Red-necked Stint
  'Phaethon rubricauda': ['hi'],  // Red-tailed Tropicbird
  'Gavia stellata': ['pnw', 'cal', 'ak', 'ne', 'se'],  // Red-throated Loon
  'Anthus cervinus': ['ak'],  // Red-throated Pipit
  'Egretta rufescens': ['cal', 'sp', 'se'],  // Reddish Egret
  'Aythya americana': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Redhead
  'Cerorhinca monocerata': ['pnw', 'cal', 'ak'],  // Rhinoceros Auklet
  'Rallus obsoletus': ['cal', 'sw'],  // Ridgway's Rail
  'Aythya collaris': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Ring-necked Duck
  'Megaceryle torquata': ['sp'],  // Ringed Kingfisher
  'Eugenes fulgens': ['sw'],  // Rivoli's Hummingbird
  'Lagopus muta': ['ak'],  // Rock Ptarmigan
  'Calidris ptilocnemis': ['pnw', 'ak'],  // Rock Sandpiper
  'Salpinctes obsoletus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Rock Wren
  'Pheucticus ludovicianus': ['rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Rose-breasted Grosbeak
  'Pachyramphus aglaiae': ['sw', 'sp'],  // Rose-throated Becard
  'Platalea ajaja': ['sp', 'se'],  // Roseate Spoonbill
  'Sterna dougallii': ['ne', 'se'],  // Roseate Tern
  'Anser rossii': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Ross's Goose
  'Rhodostethia rosea': ['ak'],  // Ross's Gull
  'Buteo lagopus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Rough-legged Hawk
  'Thalasseus maximus': ['cal', 'sp', 'ne', 'se'],  // Royal Tern
  'Archilochus colubris': ['gp', 'sp', 'mw', 'ne', 'se'],  // Ruby-throated Hummingbird
  'Columbina talpacoti': ['sw', 'sp'],  // Ruddy Ground Dove
  'Calidris pugnax': ['ak'],  // Ruff
  'Bonasa umbellus': ['pnw', 'cal', 'ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Ruffed Grouse
  'Turdus rufopalliatus': ['sw'],  // Rufous-backed Robin
  'Basileuterus rufifrons': ['sw'],  // Rufous-capped Warbler
  'Aimophila ruficeps': ['cal', 'sw', 'rm', 'sp'],  // Rufous-crowned Sparrow
  'Peucaea carpalis': ['sw'],  // Rufous-winged Sparrow
  'Emberiza rustica': ['ak'],  // Rustic Bunting
  'Euphagus carolinus': ['ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Rusty Blackbird
  'Xema sabini': ['pnw', 'cal', 'ak'],  // Sabine's Gull
  'Oreoscoptes montanus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Sage Thrasher
  'Artemisiospiza nevadensis': ['cal', 'sw', 'rm', 'gp'],  // Sagebrush Sparrow
  'Ammospiza caudacuta': ['ne', 'se'],  // Saltmarsh Sparrow
  'Antigone canadensis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'se'],  // Sandhill Crane
  'Thalasseus sandvicensis': ['sp', 'ne', 'se'],  // Sandwich Tern
  'Passerculus sandwichensis': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Savannah Sparrow
  'Callipepla squamata': ['sw', 'rm', 'gp', 'sp'],  // Scaled Quail
  'Piranga olivacea': ['gp', 'sp', 'mw', 'ne', 'se'],  // Scarlet Tanager
  'Tyrannus forficatus': ['sw', 'gp', 'sp', 'mw'],  // Scissor-tailed Flycatcher
  'Icterus parisorum': ['cal', 'sw', 'sp'],  // Scott's Oriole
  'Synthliboramphus scrippsi': ['cal'],  // Scripps's Murrelet
  'Ammospiza maritima': ['ne', 'se'],  // Seaside Sparrow
  'Cistothorus platensis': ['gp', 'sp', 'mw', 'ne', 'se'],  // Sedge Wren
  'Accipiter striatus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Sharp-shinned Hawk
  'Tympanuchus phasianellus': ['pnw', 'ak', 'rm', 'gp', 'mw'],  // Sharp-tailed Grouse
  'Calidris acuminata': ['ak', 'cal'],  // Sharp-tailed Sandpiper
  'Molothrus bonariensis': ['se'],  // Shiny Cowbird
  'Larus brachyrhynchus': ['pnw', 'cal', 'ak'],  // Short-billed Gull
  'Asio flammeus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Short-eared Owl
  'Phoebastria albatrus': ['ak'],  // Short-tailed Albatross
  'Buteo brachyurus': ['se'],  // Short-tailed Hawk
  'Ardenna tenuirostris': ['pnw', 'cal', 'ak'],  // Short-tailed Shearwater
  'Calliope calliope': ['ak'],  // Siberian Rubythroat
  'Larus schistisagus': ['ak'],  // Slaty-backed Gull
  'Mergellus albellus': ['ak'],  // Smew
  'Calcarius pictus': ['ak', 'gp', 'mw'],  // Smith's Longspur
  'Crotophaga ani': ['se'],  // Smooth-billed Ani
  'Rostrhamus sociabilis': ['se'],  // Snail Kite
  'Plectrophenax nivalis': ['ak', 'pnw', 'rm', 'gp', 'mw', 'ne'],  // Snow Bunting
  'Anser caerulescens': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Snow Goose
  'Bubo scandiacus': ['ak', 'pnw', 'rm', 'gp', 'mw', 'ne'],  // Snowy Owl
  'Tringa solitaria': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Solitary Sandpiper
  'Dendragapus fuliginosus': ['pnw', 'cal', 'ak'],  // Sooty Grouse
  'Ardenna grisea': ['pnw', 'cal', 'ak', 'ne', 'se'],  // Sooty Shearwater
  'Onychoprion fuscatus': ['hi', 'sp', 'se'],  // Sooty Tern
  'Porzana carolina': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Sora
  'Stercorarius maccormicki': ['pnw', 'cal', 'ne'],  // South Polar Skua
  'Somateria fischeri': ['ak'],  // Spectacled Eider
  'Strix occidentalis': ['pnw', 'cal', 'sw'],  // Spotted Owl
  'Actitis macularius': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Spotted Sandpiper
  'Pipilo maculatus': ['pnw', 'cal', 'sw', 'rm', 'gp'],  // Spotted Towhee
  'Anthus spragueii': ['gp', 'sp'],  // Sprague's Pipit
  'Falcipennis canadensis': ['pnw', 'ak', 'rm', 'mw', 'ne'],  // Spruce Grouse
  'Polysticta stelleri': ['ak'],  // Steller's Eider
  'Calidris himantopus': ['ak', 'gp', 'sp', 'mw', 'ne', 'se'],  // Stilt Sandpiper
  'Myiodynastes luteiventris': ['sw'],  // Sulphur-bellied Flycatcher
  'Melanitta perspicillata': ['pnw', 'cal', 'ak', 'gp', 'mw', 'ne', 'se'],  // Surf Scoter
  'Calidris virgata': ['pnw', 'cal', 'ak'],  // Surfbird
  'Buteo swainsoni': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Swainson's Hawk
  'Catharus ustulatus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne'],  // Swainson's Thrush
  'Limnothlypis swainsonii': ['sp', 'se'],  // Swainson's Warbler
  'Anser fabalis': ['ak'],  // Taiga Bean-Goose
  'Calidris temminckii': ['ak'],  // Temminck's Stint
  'Leiothlypis peregrina': ['ak', 'rm', 'gp', 'mw', 'ne', 'se'],  // Tennessee Warbler
  'Xenus cinereus': ['ak'],  // Terek Sandpiper
  'Tyrannus crassirostris': ['sw'],  // Thick-billed Kingbird
  'Rhynchophanes mccownii': ['rm', 'gp', 'sp'],  // Thick-billed Longspur
  'Uria lomvia': ['ak', 'ne'],  // Thick-billed Murre
  'Myadestes townsendi': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp'],  // Townsend's Solitaire
  'Hydrobates socorroensis': ['cal'],  // Townsend's Storm-Petrel
  'Setophaga townsendi': ['pnw', 'cal', 'ak', 'rm'],  // Townsend's Warbler
  'Tachycineta bicolor': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Tree Swallow
  'Agelaius tricolor': ['cal'],  // Tricolored Blackbird
  'Pterodroma arminjoniana': ['se'],  // Trindade Petrel
  'Hydrobates tristrami': ['hi'],  // Tristram's Storm-Petrel
  'Tyrannus melancholicus': ['sw', 'sp'],  // Tropical Kingbird
  'Setophaga pitiayumi': ['sp'],  // Tropical Parula
  'Cygnus buccinator': ['pnw', 'ak', 'rm', 'gp', 'mw'],  // Trumpeter Swan
  'Aythya fuligula': ['pnw', 'cal', 'ak', 'ne'],  // Tufted Duck
  'Fratercula cirrhata': ['pnw', 'cal', 'ak'],  // Tufted Puffin
  'Anser serrirostris': ['ak'],  // Tundra Bean-Goose
  'Cygnus columbianus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Tundra Swan
  'Bartramia longicauda': ['pnw', 'ak', 'rm', 'gp', 'mw', 'ne'],  // Upland Sandpiper
  'Passerina versicolor': ['sw', 'sp'],  // Varied Bunting
  'Chaetura vauxi': ['pnw', 'cal', 'ak'],  // Vaux's Swift
  'Catharus fuscescens': ['pnw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Veery
  'Pooecetes gramineus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Vesper Sparrow
  'Leucolia violiceps': ['sw'],  // Violet-crowned Hummingbird
  'Tachycineta thalassina': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp'],  // Violet-green Swallow
  'Rallus limicola': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Virginia Rail
  'Leiothlypis virginiae': ['sw', 'rm'],  // Virginia's Warbler
  'Tringa incana': ['pnw', 'cal', 'ak', 'hi'],  // Wandering Tattler
  'Vireo gilvus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Warbling Vireo
  'Ardenna pacifica': ['hi'],  // Wedge-tailed Shearwater
  'Sialia mexicana': ['pnw', 'cal', 'sw', 'rm'],  // Western Bluebird
  'Aechmophorus occidentalis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // Western Grebe
  'Tyrannus verticalis': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Western Kingbird
  'Sturnella neglecta': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Western Meadowlark
  'Calidris mauri': ['pnw', 'cal', 'ak', 'sw', 'gp', 'sp', 'mw', 'ne', 'se'],  // Western Sandpiper
  'Megascops kennicottii': ['pnw', 'cal', 'sw', 'rm'],  // Western Screech-Owl
  'Spindalis zena': ['se'],  // Western Spindalis
  'Piranga ludoviciana': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp'],  // Western Tanager
  'Contopus sordidulus': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp'],  // Western Wood-Pewee
  'Numenius phaeopus': ['pnw', 'cal', 'ak', 'gp', 'sp', 'ne', 'se'],  // Whimbrel
  'Aethia pygmaea': ['ak'],  // Whiskered Auklet
  'Megascops trichopsis': ['sw'],  // Whiskered Screech-Owl
  'Gygis alba': ['hi'],  // White Tern
  'Motacilla alba': ['ak'],  // White Wagtail
  'Patagioenas leucocephala': ['se'],  // White-crowned Pigeon
  'Zonotrichia leucophrys': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // White-crowned Sparrow
  'Basilinna leucotis': ['sw'],  // White-eared Hummingbird
  'Plegadis chihi': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp'],  // White-faced Ibis
  'Pelagodroma marina': ['cal'],  // White-faced Storm-Petrel
  'Dryobates albolarvatus': ['pnw', 'cal'],  // White-headed Woodpecker
  'Pterodroma cervicalis': ['hi'],  // White-necked Petrel
  'Calidris fuscicollis': ['ak', 'gp', 'sp', 'mw', 'ne', 'se'],  // White-rumped Sandpiper
  'Geranoaetus albicaudatus': ['sp'],  // White-tailed Hawk
  'Elanus leucurus': ['pnw', 'cal', 'sw', 'sp', 'se'],  // White-tailed Kite
  'Lagopus leucura': ['pnw', 'ak', 'rm'],  // White-tailed Ptarmigan
  'Phaethon lepturus': ['hi', 'se'],  // White-tailed Tropicbird
  'Leptotila verreauxi': ['sp'],  // White-tipped Dove
  'Loxia leucoptera': ['ak', 'pnw', 'rm', 'mw', 'ne'],  // White-winged Crossbill
  'Zenaida asiatica': ['cal', 'sw', 'sp', 'se'],  // White-winged Dove
  'Melanitta deglandi': ['pnw', 'cal', 'ak', 'gp', 'mw', 'ne', 'se'],  // White-winged Scoter
  'Cygnus cygnus': ['ak'],  // Whooper Swan
  'Grus americana': ['sp', 'gp'],  // Whooping Crane
  'Sphyrapicus thyroideus': ['pnw', 'cal', 'sw', 'rm'],  // Williamson's Sapsucker
  'Empidonax traillii': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Willow Flycatcher
  'Lagopus lagopus': ['ak'],  // Willow Ptarmigan
  'Phalaropus tricolor': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Wilson's Phalarope
  'Gallinago delicata': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Wilson's Snipe
  'Oceanites oceanicus': ['ne', 'se'],  // Wilson's Storm-Petrel
  'Cardellina pusilla': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'mw', 'ne', 'se'],  // Wilson's Warbler
  'Troglodytes hiemalis': ['rm', 'gp', 'mw', 'ne', 'se'],  // Winter Wren
  'Aix sponsa': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Wood Duck
  'Tringa glareola': ['ak'],  // Wood Sandpiper
  'Mycteria americana': ['sp', 'se'],  // Wood Stork
  'Aphelocoma woodhouseii': ['cal', 'sw', 'rm', 'gp'],  // Woodhouse's Scrub-Jay
  'Helmitheros vermivorum': ['gp', 'sp', 'mw', 'ne', 'se'],  // Worm-eating Warbler
  'Coturnicops noveboracensis': ['gp', 'mw', 'ne', 'se'],  // Yellow Rail
  'Setophaga petechia': ['pnw', 'cal', 'ak', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Yellow Warbler
  'Empidonax flaviventris': ['ak', 'rm', 'gp', 'mw', 'ne'],  // Yellow-bellied Flycatcher
  'Coccyzus americanus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Yellow-billed Cuckoo
  'Gavia adamsii': ['ak'],  // Yellow-billed Loon
  'Pica nuttalli': ['cal'],  // Yellow-billed Magpie
  'Icteria virens': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw', 'ne', 'se'],  // Yellow-breasted Chat
  'Nyctanassa violacea': ['sw', 'sp', 'mw', 'ne', 'se'],  // Yellow-crowned Night-Heron
  'Junco phaeonotus': ['sw'],  // Yellow-eyed Junco
  'Larus livens': ['cal', 'sw'],  // Yellow-footed Gull
  'Vireo flavoviridis': ['sp'],  // Yellow-green Vireo
  'Xanthocephalus xanthocephalus': ['pnw', 'cal', 'sw', 'rm', 'gp', 'sp', 'mw'],  // Yellow-headed Blackbird
  'Vireo flavifrons': ['gp', 'sp', 'mw', 'ne', 'se'],  // Yellow-throated Vireo
  'Buteo albonotatus': ['sw', 'sp'],  // Zone-tailed Hawk
};
const SPECIES_FACTS = {
  // e.g. 'Setophaga cerulea': 'One of the fastest-declining warblers in North America.',
};

const MOVEMENT_LABEL = { migratory: 'Migratory', resident: 'Resident', partial: 'Partial migrant' };
const IUCN_LABEL = { CR: 'Critically Endangered', EN: 'Endangered', VU: 'Vulnerable', NT: 'Near Threatened' };

// ---------- storage keys ----------
const STORAGE = {
  userCount: 'ebird:userCount',
  csvMeta: 'ebird:csvMeta',
  seenSci: 'ebird:seenSci',
  points: 'ebird:points',
  firstSightingPoints: 'ebird:firstSightingPoints',
  locations: 'ebird:locations',
  apiKey: 'ebird:apiKey',
  // Cached eBird API responses live under 'ebird:hotspot:{locId}'
};

// ---------- eBird API client ----------
// Public docs: https://documenter.getpostman.com/view/664302/S1ENwy59
// Auth: send the user's API key as the X-eBirdApiToken header.
// All endpoints are GET, JSON responses.
const EBIRD_BASE = 'https://api.ebird.org/v2';
const HOTSPOT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function ebirdFetch(path, apiKey) {
  const res = await fetch(`${EBIRD_BASE}${path}`, {
    headers: { 'X-eBirdApiToken': apiKey },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`eBird ${res.status}${txt ? ': ' + txt.slice(0, 120) : ''}`);
  }
  return res.json();
}

// "Recent observations at a hotspot, last N days" — returns observations with
// scientific names already populated. Good for surfacing "actually findable
// now" species. The `back` param maxes out at 30 days on the public API.
async function fetchRecentAtLocation(locId, apiKey, back = 30) {
  return ebirdFetch(
    `/data/obs/${locId}/recent?back=${back}&maxResults=10000&includeProvisional=false`,
    apiKey,
  );
}

// All observations at a hotspot on a specific date. Unlike the various "recent"
// endpoints (which dedupe to one entry per species per location), historic
// returns every individual observation submitted on that date — so we can
// actually count how many distinct people reported a given bird. This is the
// endpoint that powers the "≥ 2 separate observers" verification.
async function fetchHistoricAtLocation(locId, year, month, day, apiKey) {
  return ebirdFetch(
    `/data/obs/${locId}/historic/${year}/${month}/${day}?maxResults=10000&includeProvisional=false`,
    apiKey,
  );
}

// Lightweight per-hotspot cache (IndexedDB via the existing storage helper)
async function getCachedHotspot(locId) {
  const v = await storage.get(`ebird:hotspot:${locId}`);
  if (!v || !v.timestamp || !v.data) return null;
  if (Date.now() - v.timestamp > HOTSPOT_TTL_MS) return null;
  return v.data;
}
async function setCachedHotspot(locId, data) {
  await storage.set(`ebird:hotspot:${locId}`, { timestamp: Date.now(), data });
}

// Per-(hotspot, day) cache for historic observations. 24h TTL — short enough
// that "today" stays reasonably fresh, long enough that scrolling through
// recent days is instant. Older days are essentially frozen anyway.
const HISTORIC_TTL_MS = 24 * 60 * 60 * 1000;
async function getCachedHistoric(locId, dateStr) {
  const v = await storage.get(`ebird:hist:${locId}:${dateStr}`);
  if (!v || !v.timestamp) return null;
  if (Date.now() - v.timestamp > HISTORIC_TTL_MS) return null;
  return v.data || [];
}
async function setCachedHistoric(locId, dateStr, data) {
  await storage.set(`ebird:hist:${locId}:${dateStr}`, {
    timestamp: Date.now(),
    data: data || [],
  });
}

// ---------- CSV parsing ----------
function parseEBirdCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          const sample = rows[0] || {};
          const stateKey = ['State/Province', 'State/Province ', 'State'].find(k => k in sample) || 'State/Province';
          const sciKey = ['Scientific Name'].find(k => k in sample) || 'Scientific Name';
          const comKey = ['Common Name'].find(k => k in sample) || 'Common Name';
          const dateKey = ['Date'].find(k => k in sample) || 'Date';
          const submissionKey = ['Submission ID', 'Submission Id', 'submission_id'].find(k => k in sample) || 'Submission ID';
          const latKey = ['Latitude'].find(k => k in sample) || 'Latitude';
          const lngKey = ['Longitude'].find(k => k in sample) || 'Longitude';
          const locIdKey = ['Location ID'].find(k => k in sample) || 'Location ID';
          const locNameKey = ['Location'].find(k => k in sample) || 'Location';

          const usRows = rows.filter(r => {
            const s = r[stateKey];
            return s && typeof s === 'string' && s.startsWith('US-');
          });

          const isCountable = (sci, com) => {
            const name = (sci || com || '').trim();
            if (!name) return false;
            if (/\bsp\.\s*$/.test(name)) return false;
            if (name.includes('/')) return false;
            if (/\sx\s/i.test(name) || /\(hybrid\)/i.test(name)) return false;
            if (/\(.*domestic.*\)/i.test(name)) return false;
            return true;
          };

          const allSpecies = new Set();
          const nativeSci = new Set();
          // Group countable observations by location.
          // `locations` keeps full data needed for both the heatmap (lng/lat/weight)
          // AND the tips feature (id/name/native species list).
          const locations = new Map();
          // For "First Sightings" heatmap: track the EARLIEST observation of each
          // species across all rows. The location of that first sighting is where
          // the user "discovered" that species. We keep date as a comparable epoch
          // number rather than parsing per-row repeatedly.
          const firstSightingByss = new Map(); // sci → {ts, lng, lat}
          // Native species seen per region, keyed by region id (pnw, cal, ...)
          // We read the state from the existing "State/Province" column (which
          // we already require to be "US-XX") and look up its region.
          const speciesByRegion = new Map();
          // Per-species personal stats for the detail card, keyed by binomial
          // sci. We track total countable sightings, the set of locationIds the
          // species was seen at, the earliest sighting timestamp, and the set of
          // region ids it was seen in. Sets are converted to counts/arrays at
          // emit time. Only native (checklist) species are tracked.
          const perSpeciesStats = new Map(); // sci → {sightings, locIds:Set, firstTs, regions:Set}
          // Diagnostic: scientific names from countable rows that AREN'T in
          // NATIVE_SCI. Most will be legitimate non-natives (introduced
          // species, vagrant exotics) — but some may indicate AOS/Clements
          // taxonomy updates the app's checklist hasn't caught up with, like
          // the 2021 cormorant split (Phalacrocorax → Urile / Nannopterum).
          // Surfacing the list lets the user (and me) spot these.
          const unrecognized = new Map(); // sci → { sci, com, count }
          // Distinct non-native species recorded within the US (vagrants,
          // escapees, established exotics). Powers the "Fowl Play" badge.
          const usNonNativeSci = new Set();
          // Distinct eBird checklists (Submission IDs) — a more meaningful
          // activity metric than raw observation rows, which can double-count.
          const checklistIds = new Set();
          let earliest = null, latest = null;
          let totalObservations = 0;

          for (const r of usRows) {
            totalObservations++;
            const subId = r[submissionKey];
            if (subId) checklistIds.add(subId);
            const sci = (r[sciKey] || '').trim();
            const com = r[comKey];
            const dStr = r[dateKey];
            const dt = dStr ? new Date(dStr) : null;
            const dtValid = dt && !isNaN(dt);
            // "US-NC" → "NC" → "se". Cheap & only runs once per row.
            const stateAbbr = (r[stateKey] || '').slice(3);
            const regionId = STATE_TO_REGION[stateAbbr] || null;
            // Is this observation from a checklist submitted in the US? eBird
            // prefixes State/Province with the ISO country code, so anything
            // starting "US-" (including US territories) counts; "CR-A" (Costa
            // Rica) etc. does not. Used for the "Fowl Play" badge, which counts
            // distinct NON-native species recorded specifically within the US
            // (vagrants, escapees, established exotics) — not vacation birds.
            const isUsObservation = (r[stateKey] || '').startsWith('US-');
            // eBird CSVs export subspecies-level reports as TRINOMIALS, e.g.
            // "Dryobates villosus septentrionalis" for Eastern Hairy Woodpecker.
            // Those won't match a binomial NATIVE_SCI entry. Strip to first two
            // tokens so subspecies reports collapse to their parent species.
            // (Spuhs/slashes/hybrids are already filtered by isCountable above,
            // so the first two tokens here are always a valid Genus species.)
            // canonicalSci() then maps eBird genus-synonyms (e.g.
            // "Leuconotopicus villosus" -> "Dryobates villosus") to our list.
            const baseSci = sci ? canonicalSci(sci.split(/\s+/).slice(0, 2).join(' ')) : '';

            if (isCountable(sci, com)) {
              // Use the binomial form as the species key so subspecies reports
              // don't create phantom "extra" species in counters and tips.
              const speciesKey = baseSci || com;
              allSpecies.add(speciesKey);
              if (baseSci && NATIVE_SCI.has(baseSci)) {
                nativeSci.add(baseSci);
                // per-species personal stats: count this sighting, note region
                let ps = perSpeciesStats.get(baseSci);
                if (!ps) { ps = { sightings: 0, locIds: new Set(), firstTs: null, regions: new Set() }; perSpeciesStats.set(baseSci, ps); }
                ps.sightings++;
                if (regionId) ps.regions.add(regionId);
                if (dtValid) { const ts = dt.getTime(); if (ps.firstTs == null || ts < ps.firstTs) ps.firstTs = ts; }
                if (regionId) {
                  let set = speciesByRegion.get(regionId);
                  if (!set) { set = new Set(); speciesByRegion.set(regionId, set); }
                  set.add(baseSci);
                }
              } else if (sci) {
                // Sci name present but not in our native checklist. Could be a
                // legitimate exotic or a taxonomy-update miss. Bucket it for
                // the diagnostic — under the *original* sci so we can see the
                // exact name eBird is exporting.
                let entry = unrecognized.get(sci);
                if (!entry) { entry = { sci, com: com || '', count: 0 }; unrecognized.set(sci, entry); }
                entry.count++;
                // If this non-native was seen on a US checklist, record the
                // (binomial) species for the Fowl Play badge.
                if (isUsObservation) usNonNativeSci.add(speciesKey);
              }
              const lat = parseFloat(r[latKey]);
              const lng = parseFloat(r[lngKey]);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                // Prefer eBird's Location ID; fall back to coordinate key
                const locId = (r[locIdKey] && String(r[locIdKey]).trim()) ||
                              `${lng.toFixed(5)},${lat.toFixed(5)}`;
                let loc = locations.get(locId);
                if (!loc) {
                  loc = {
                    id: locId,
                    name: (r[locNameKey] && String(r[locNameKey]).trim()) || null,
                    lng, lat,
                    species: new Set(),
                    nativeSpecies: new Set(),
                  };
                  locations.set(locId, loc);
                }
                loc.species.add(speciesKey);
                if (baseSci && NATIVE_SCI.has(baseSci)) {
                  loc.nativeSpecies.add(baseSci);
                  const ps = perSpeciesStats.get(baseSci);
                  if (ps) ps.locIds.add(locId);
                }
                // Track the first sighting of this species. Use the binomial
                // sci when available so subspecies reports of one species map
                // to a single "first sighting" rather than producing duplicates.
                const key = baseSci || com;
                if (key && dtValid) {
                  const ts = dt.getTime();
                  const prev = firstSightingByss.get(key);
                  if (!prev || ts < prev.ts) {
                    firstSightingByss.set(key, { ts, lng, lat });
                  }
                }
              }
            }
            if (dtValid) {
              if (!earliest || dt < earliest) earliest = dt;
              if (!latest || dt > latest) latest = dt;
            }
          }

          // Aggregate first sightings by location: each species's first-found
          // location gets +1 weight. This flattens the heatmap compared to the
          // overall-sightings version, since recurring visits to a single
          // hotspot only add weight for *new* species there, not every species
          // re-seen.
          const firstByLoc = new Map(); // "lng,lat" → {lng, lat, count}
          for (const { lng, lat } of firstSightingByss.values()) {
            const k = `${lng.toFixed(5)},${lat.toFixed(5)}`;
            let entry = firstByLoc.get(k);
            if (!entry) {
              entry = { lng, lat, count: 0 };
              firstByLoc.set(k, entry);
            }
            entry.count++;
          }

          // Outputs:
          //   points              — [[lng, lat, speciesCount, [sciIdx,...]], ...]
          //                         heatmap data. [2] is the distinct-species
          //                         COUNT at the location (kept for the "peak N
          //                         at one spot" stat and back-compat); [3] is
          //                         the list of native-species indices present
          //                         there, used by the distinct-species density
          //                         to de-duplicate species shared across nearby
          //                         locations.
          //   firstSightingPoints — [[lng, lat, newSpeciesCount], ...] heatmap, FIRST sightings only
          //   locations           — [{id, name, lng, lat, species, nativeSpecies}, ...] for tips
          const points = [];
          const locationsArr = [];
          for (const loc of locations.values()) {
            const sciIdx = [];
            for (const s of loc.nativeSpecies) {
              const idx = SCI_TO_INDEX.get(s);
              if (idx !== undefined) sciIdx.push(idx);
            }
            points.push([loc.lng, loc.lat, loc.species.size, sciIdx]);
            // Only locations with a real eBird Location ID can be queried via the API.
            // Coordinate-key locations are kept out of the tips dataset.
            if (loc.id && loc.id.startsWith('L')) {
              locationsArr.push({
                id: loc.id,
                name: loc.name,
                lng: loc.lng,
                lat: loc.lat,
                species: Array.from(loc.nativeSpecies),
              });
            }
          }
          const firstSightingPoints = [];
          for (const { lng, lat, count } of firstByLoc.values()) {
            firstSightingPoints.push([lng, lat, count]);
          }

          resolve({
            count: nativeSci.size,
            allCount: allSpecies.size,
            seenSci: Array.from(nativeSci),
            points,
            firstSightingPoints,
            locations: locationsArr,
            meta: {
              observations: totalObservations,
              checklists: checklistIds.size,
              earliest: earliest ? earliest.toISOString() : null,
              latest: latest ? latest.toISOString() : null,
              fileName: file.name,
              updatedAt: new Date().toISOString(),
              allCount: allSpecies.size,
              locationCount: points.length,
              ebirdLocations: locationsArr.length,
              firstSightingLocations: firstSightingPoints.length,
              // Count of distinct NON-native species recorded on US checklists
              // (vagrants/escapees/exotics seen in the US) — for Fowl Play.
              usNonNativeCount: usNonNativeSci.size,
              // { 'pnw': 87, 'cal': 134, ... } — native species count per region
              regionNativeCount: Object.fromEntries(
                Array.from(speciesByRegion, ([id, set]) => [id, set.size])
              ),
              // Per-species personal stats for the detail card, keyed by sci:
              // { sci: { n: sightings, loc: locationCount, first: iso|null,
              //   regions: [regionId,...] } }. Only seen species appear here.
              speciesStats: Object.fromEntries(
                Array.from(perSpeciesStats, ([sci, ps]) => [sci, {
                  n: ps.sightings,
                  loc: ps.locIds.size,
                  first: ps.firstTs != null ? new Date(ps.firstTs).toISOString() : null,
                  regions: Array.from(ps.regions),
                }])
              ),
              // Sorted by observation count desc; top 200 only to keep meta
              // small. The full list of unmatched sci names lets us see which
              // species in the CSV didn't hit our native checklist.
              unrecognizedSci: Array.from(unrecognized.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 200),
            },
          });
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

// ---------- formatting helpers ----------
const fmt = (n) => (n == null ? '—' : n.toLocaleString('en-US'));
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};
const relativeTime = (iso) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo > 1 ? 's' : ''} ago`;
};

// ---------- main component ----------
export default function BirdLifeTracker() {
  const [userCount, setUserCount] = useState(null);
  const [csvMeta, setCsvMeta] = useState(null);
  const [seenSci, setSeenSci] = useState(() => new Set());
  const [points, setPoints] = useState(null); // [[lng, lat, w], ...] for heatmap, all species
  const [firstSightingPoints, setFirstSightingPoints] = useState(null); // [[lng, lat, w], ...] for first-sighting heatmap
  const [locations, setLocations] = useState(null); // [{id, name, lng, lat, species}] for tips
  const [apiKey, setApiKey] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showFamilies, setShowFamilies] = useState(false);
  // When non-null, the species list drawer is opened in a scoped view
  // (e.g. only Code 3 birds, or only species in one family).
  const [listFilter, setListFilter] = useState(null);
  // Top-level view router. 'dashboard' is the count/stats home; 'map' is the
  // full-page heatmap. Keeping this on the parent (rather than a route) lets
  // us swap the entire content area without losing state in the other view.
  const [view, setView] = useState('dashboard');

  // Whenever the top-level view changes (dashboard ⇄ map ⇄ badges), reset the
  // scroll position to the top so each page opens at its header rather than
  // wherever the previous page was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  const [showInstall, setShowInstall] = useState(false);
  // Deferred install prompt from Chrome/Edge/Samsung Internet — captured at
  // load time, fired only when the user clicks our install button. iOS Safari
  // never produces this event so we fall back to manual instructions there.
  const [installPrompt, setInstallPrompt] = useState(null);
  // True once the user has accepted the prompt (or if the app is already
  // running in standalone mode). We hide the install UI in both cases.
  const [isInstalled, setIsInstalled] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [progressAnim, setProgressAnim] = useState(0);
  // File-picker refs are no longer needed: the upload UI uses a <label>
  // wrapping a hidden but functional <input type="file"> so iOS Safari
  // standalone-PWA can open the picker via a native tap on the label
  // (programmatic .click() on a display:none input was unreliable there).

  // Detect "already installed" state on mount + when display-mode changes.
  useEffect(() => {
    const check = () => {
      const standalone =
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
      setIsInstalled(standalone);
    };
    check();
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', check);
    return () => mq.removeEventListener?.('change', check);
  }, []);

  // Capture beforeinstallprompt so we can fire it on demand.
  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    function onInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    // If Chrome/Edge handed us a deferred prompt, fire it now.
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      } catch (e) {
        // Some browsers throw if prompt() is called twice — open the manual
        // instructions as a fallback.
        setShowInstall(true);
      }
    } else {
      // iOS Safari or browser without prompt support → show the tutorial.
      setShowInstall(true);
    }
  }

  // ---- open-helpers for the species list drawer ----
  function openAllSpecies() {
    setListFilter(null);
    setShowList(true);
  }
  function openCode3List() {
    setListFilter({
      title: 'Rare Bird Finds',
      eyebrow: 'ABA Code 3',
      subtitle: 'rare but annual',
      restrictType: 'code3',
    });
    setShowList(true);
  }
  function openAtRiskList() {
    setListFilter({
      title: 'At-Risk Species',
      eyebrow: 'IUCN Red List',
      subtitle: 'threatened with extinction',
      restrictType: 'atrisk',
    });
    setShowList(true);
  }
  function openFamilyList(family) {
    setListFilter({
      title: family,
      eyebrow: 'Family',
      restrictType: 'family',
      restrictValue: family,
    });
    setShowList(true);
  }

  // hydrate from storage
  //
  // Three safety mechanisms against the "stuck on loading screen" failure
  // mode (reported intermittently, especially on iOS Safari):
  //
  //   1. Promise.allSettled instead of Promise.all — if a single storage.get
  //      rejects (corrupt value, quota error), the other reads still
  //      complete and hydration continues. Without this, one bad key
  //      blocked all the others.
  //
  //   2. try/finally around the whole IIFE — guarantees setHydrated(true)
  //      runs no matter what throws inside. The previous version had no
  //      catch, so any unexpected exception left the splash visible
  //      forever with no error surface.
  //
  //   3. 8-second watchdog timer — IndexedDB can hang indefinitely on
  //      iOS Safari when private browsing is on, when a Service Worker is
  //      mid-upgrade, or in low-memory situations. The watchdog
  //      force-hydrates after the timeout so the user always lands on the
  //      home screen — they may be in the "empty" state (since no data
  //      was read), but they can re-upload their CSV. Better than a
  //      permanent loading screen.
  useEffect(() => {
    let cancelled = false;

    // 8s watchdog: if hydration hasn't finished by then, force the splash
    // to dismiss. Storage reads either finished or got stuck — either way
    // continuing with whatever we have is better than hanging forever.
    const watchdog = setTimeout(() => {
      if (!cancelled) setHydrated(true);
    }, 8000);

    (async () => {
      try {
        const results = await Promise.allSettled([
          storage.get(STORAGE.userCount),
          storage.get(STORAGE.csvMeta),
          storage.get(STORAGE.seenSci),
          storage.get(STORAGE.points),
          storage.get(STORAGE.firstSightingPoints),
          storage.get(STORAGE.locations),
          storage.get(STORAGE.apiKey),
        ]);
        if (cancelled) return;

        // Pull values out of settled-results — `null` for any rejection or
        // missing key. Each setter is in its own try/catch so a single
        // corrupt JSON value doesn't break the others.
        const valueOf = (i) => (results[i].status === 'fulfilled' ? results[i].value : null);
        const [u, m, s, p, fp, l, k] = [0, 1, 2, 3, 4, 5, 6].map(valueOf);

        if (u) { try { setUserCount(parseInt(u, 10)); } catch {} }
        if (m) { try { setCsvMeta(JSON.parse(m)); } catch {} }
        if (s) { try { setSeenSci(new Set(JSON.parse(s))); } catch {} }
        if (p) { try { setPoints(JSON.parse(p)); } catch {} }
        if (fp) { try { setFirstSightingPoints(JSON.parse(fp)); } catch {} }
        if (l) { try { setLocations(JSON.parse(l)); } catch {} }
        if (k) setApiKey(k);
      } catch {
        // Anything that escaped the try blocks above. We still want to
        // dismiss the splash and let the user see the home screen.
      } finally {
        if (!cancelled) {
          clearTimeout(watchdog);
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, []);

  // toast auto-dismiss
  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, 4000);
    return () => clearTimeout(t);
  }, [error, success]);

  // File Handling API: if the OS launches the app with a file (e.g. user taps a
  // .csv in their file manager), process it. Supported on Android Chrome and
  // desktop browsers; silently no-op on iOS Safari (which lacks the API).
  useEffect(() => {
    if (!('launchQueue' in window)) return;
    try {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams?.files?.length) return;
        for (const handle of launchParams.files) {
          try {
            const file = await handle.getFile();
            if (file && file.name.toLowerCase().endsWith('.csv')) {
              await onCsvFile(file);
              break;
            }
          } catch {}
        }
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // animate progress bar
  useEffect(() => {
    if (userCount == null) {
      setProgressAnim(0);
      return;
    }
    const target = Math.min(userCount / TOTAL, 1);
    let raf, start;
    const dur = 1400;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setProgressAnim(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [userCount]);

  async function onCsvFile(file) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { count, allCount, seenSci: nextSeen, points: nextPoints, firstSightingPoints: nextFirstSightingPoints, locations: nextLocations, meta } = await parseEBirdCsv(file);
      const seenSet = new Set(nextSeen);
      setUserCount(count);
      setCsvMeta(meta);
      setSeenSci(seenSet);
      setPoints(nextPoints);
      setFirstSightingPoints(nextFirstSightingPoints);
      setLocations(nextLocations);
      await storage.set(STORAGE.userCount, String(count));
      await storage.set(STORAGE.csvMeta, JSON.stringify(meta));
      await storage.set(STORAGE.seenSci, JSON.stringify(nextSeen));
      await storage.set(STORAGE.points, JSON.stringify(nextPoints));
      await storage.set(STORAGE.firstSightingPoints, JSON.stringify(nextFirstSightingPoints));
      await storage.set(STORAGE.locations, JSON.stringify(nextLocations));
      const extra = allCount - count;
      const extraNote = extra > 0 ? ` (${extra} non-native or rare visitor${extra === 1 ? '' : 's'} excluded)` : '';
      setSuccess(`Counted ${count.toLocaleString()} of ${TOTAL} native species${extraNote}.`);
    } catch (e) {
      setError("Couldn't read that file. Make sure it's the MyEBirdData.csv export from My eBird → Download My Data.");
    } finally {
      setLoading(false);
    }
  }

  async function saveApiKey(value) {
    const trimmed = (value || '').trim();
    if (trimmed) {
      await storage.set(STORAGE.apiKey, trimmed);
      setApiKey(trimmed);
    } else {
      await storage.del(STORAGE.apiKey);
      setApiKey(null);
    }
  }

  async function resetAll() {
    if (!confirm('Clear stored data (count, sightings, CSV summary, map, cached tips)? Your eBird API key is kept.')) return;
    // Clear bird/location data
    await Promise.all([
      storage.del(STORAGE.userCount),
      storage.del(STORAGE.csvMeta),
      storage.del(STORAGE.seenSci),
      storage.del(STORAGE.points),
      storage.del(STORAGE.firstSightingPoints),
      storage.del(STORAGE.locations),
    ]);
    // Also flush cached per-hotspot, per-species, and historic-day eBird data
    try {
      const [hotspotKeys, speciesKeys, histKeys] = await Promise.all([
        storage.list('ebird:hotspot:'),
        storage.list('ebird:species:'),
        storage.list('ebird:hist:'),
      ]);
      const all = [
        ...(hotspotKeys?.keys || []),
        ...(speciesKeys?.keys || []),
        ...(histKeys?.keys || []),
      ];
      await Promise.all(all.map((k) => storage.del(k)));
    } catch {
      // list() may not be supported by older storage; non-fatal
    }
    setUserCount(null);
    setCsvMeta(null);
    setSeenSci(new Set());
    setPoints(null);
    setFirstSightingPoints(null);
    setLocations(null);
    setSuccess('Cleared.');
  }

  // Derived stats: unique families seen, and Code 3 rare finds.
  const familiesSeen = useMemo(() => {
    if (!seenSci || seenSci.size === 0) return 0;
    const fams = new Set();
    for (const sci of seenSci) {
      const f = SCI_TO_FAMILY.get(sci);
      if (f) fams.add(f);
    }
    return fams.size;
  }, [seenSci]);

  const code3Seen = useMemo(() => {
    if (!seenSci || seenSci.size === 0) return 0;
    let n = 0;
    for (const sci of seenSci) if (CODE_3_SCI.has(sci)) n++;
    return n;
  }, [seenSci]);

  const atRiskSeen = useMemo(() => {
    if (!seenSci || seenSci.size === 0) return 0;
    let n = 0;
    for (const sci of seenSci) if (AT_RISK_SCI.has(sci)) n++;
    return n;
  }, [seenSci]);

  const TOTAL_FAMILIES = FAMILY_BOUNDARIES.length;
  const TOTAL_CODE_3 = CODE_3_SCI.size;
  const TOTAL_AT_RISK = AT_RISK_SCI.size;

  const pct = userCount != null ? (userCount / TOTAL) * 100 : null;
  const remaining = userCount != null ? TOTAL - userCount : null;
  const empty = hydrated && userCount == null;

  return (
    <div className="font-body min-h-screen w-full relative" style={{
      // Sky gradient — sits behind the app content
      background: 'linear-gradient(180deg, #6cb8e4 0%, #a8d8eb 40%, #f8d9a8 100%)',
      backgroundAttachment: 'fixed',
      color: '#2a3445',
    }}>
      <style>{`
        /* ===========================================================
           Birdfolk visual tokens — chunky pastel Animal Crossing vibe.
           Replaces the old dark-teal field-guide tokens. All component
           classes referenced by name throughout App.jsx are redefined
           here so the look pivots without churning every className.
           =========================================================== */

        /* Typography — Fredoka for display headlines, Nunito for body,
           JetBrains Mono retained for technical numerics. */
        .font-display { font-family: 'Fredoka', system-ui, sans-serif; font-weight: 600; letter-spacing: 0; font-feature-settings: 'tnum' 1; }
        .font-body { font-family: 'Nunito', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: 'tnum' 1; }

        /* Text colors — darker ink on cream paper */
        .ink { color: #2a3445; }
        .ink-soft { color: #5a4a3e; }
        .ink-faint { color: #7a6a55; }

        /* Accents — high-saturation cute palette.
           'rust' stays the name for backwards compatibility but now points
           to coral. 'moss' goes to mint, 'teal' goes to sky blue. */
        .rust { color: #ff6b6b; }
        .moss { color: #5cba87; }
        .teal { color: #5fa8d3; }

        /* Surfaces — chunky white cards with dark borders + offset shadows.
           This is the Animal Crossing "3D button" look applied to all card
           surfaces. surface-1 is the default white card; surface-2 is the
           slightly warmer cream card used for emphasis areas. */
        .surface-1 {
          background: #fff;
          border: 2.5px solid #2a3445;
          box-shadow: 0 4px 0 0 #2a3445;
          border-radius: 18px;
        }
        .surface-2 {
          background: #fff8e8;
          border: 2.5px solid #2a3445;
          box-shadow: 0 4px 0 0 #2a3445;
          border-radius: 18px;
        }
        .grain { /* retired — chunky shadows do the heavy lifting now */ }

        /* Rules / dividers */
        .rule { border-color: rgba(42,52,69,0.18); }
        .rule-dashed { background-image: linear-gradient(to right, rgba(42,52,69,0.25) 50%, transparent 50%); background-size: 8px 1px; background-repeat: repeat-x; height: 1px; }

        /* Animations — kept identical to old app for entrance choreography */
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .anim-1 { animation: fadeUp 0.5s 0.05s both ease-out; }
        .anim-2 { animation: fadeUp 0.5s 0.15s both ease-out; }
        .anim-3 { animation: fadeUp 0.5s 0.25s both ease-out; }
        .anim-4 { animation: fadeUp 0.5s 0.35s both ease-out; }
        .anim-5 { animation: fadeUp 0.5s 0.45s both ease-out; }
        .toast { animation: fadeIn 0.25s ease-out; }

        /* Stamp pill — small badge on the empty state etc. Now reads like
           a Nintendo-style "New!" badge in coral. */
        .stamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: #ff6b6b;
          color: #fff;
          font-family: 'Fredoka', system-ui, sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border: 2.5px solid #a83a3a;
          box-shadow: 0 2px 0 0 #a83a3a;
          text-shadow: 0 1px 0 #a83a3a;
          border-radius: 999px;
        }

        /* Buttons — chunky pills with offset shadows */
        .btn-ink {
          background: #ff6b6b;
          color: #fff;
          font-family: 'Fredoka', system-ui, sans-serif;
          font-weight: 700;
          border: 2.5px solid #a83a3a;
          box-shadow: 0 3px 0 0 #a83a3a;
          text-shadow: 0 1.5px 0 #a83a3a;
          letter-spacing: 0.02em;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .btn-ink:hover { transform: translateY(-1px); box-shadow: 0 4px 0 0 #a83a3a; }
        .btn-ink:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #a83a3a; }
        .btn-ink:disabled { background: rgba(0,0,0,0.08); color: rgba(0,0,0,0.4); border-color: rgba(0,0,0,0.15); box-shadow: 0 3px 0 0 rgba(0,0,0,0.15); text-shadow: none; cursor: not-allowed; transform: none; }

        .btn-ghost {
          background: #fff;
          color: #2a3445;
          font-family: 'Fredoka', system-ui, sans-serif;
          font-weight: 600;
          border: 2.5px solid #2a3445;
          box-shadow: 0 3px 0 0 #2a3445;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .btn-ghost:hover { transform: translateY(-1px); box-shadow: 0 4px 0 0 #2a3445; }
        .btn-ghost:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #2a3445; }
        .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        /* Inputs — friendly rounded with thick dark borders */
        .input-field {
          background: #fff;
          border: 2.5px solid #2a3445;
          color: #2a3445;
          border-radius: 12px;
          font-family: 'Nunito', system-ui, sans-serif;
          font-weight: 500;
        }
        .input-field::placeholder { color: #9a8a75; }
        .input-field:focus { outline: none; box-shadow: 0 0 0 3px rgba(255,107,107,0.25); }

        /* Lists / rows */
        .species-row { transition: background 0.12s; }
        .species-row:hover { background: rgba(255,224,102,0.18); }

        /* Card lift hover */
        .lift { transition: transform 0.12s, box-shadow 0.12s; }
        .lift:hover { transform: translateY(-2px); }
      `}</style>

      {view === 'dashboard' && (
      <div
        className="relative max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-5 flex flex-col"
        style={{ minHeight: '100dvh' }}
      >
        {/* ===== Chunky sky banner header =====
            Sits at the top of every dashboard view. Sky-blue gradient with a
            thick dark border + offset shadow (signature AC button look). The
            bluebird mascot sits on the left, brand on the right of it, and
            the settings cog floats on the right as a chunky white circle.
            Decorative clouds drift in the background. */}
        <header
          className="anim-1 relative overflow-hidden rounded-3xl mb-3"
          style={{
            background: 'linear-gradient(135deg, #7cc4e8 0%, #a8dff5 60%, #c5e8ff 100%)',
            border: '3px solid #2a5680',
            boxShadow: '0 5px 0 0 #2a5680',
            padding: 'clamp(8px, 1.6dvh, 14px) 16px clamp(10px, 1.8dvh, 16px)',
          }}
        >
          <div className="absolute top-1.5 right-16 pointer-events-none"><Cloud size={48} opacity={0.85} /></div>
          <div className="absolute top-7 right-32 pointer-events-none"><Cloud size={32} opacity={0.7} /></div>
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BluebirdMascot size={52} className="flex-shrink-0 drop-shadow-md" />
              <div>
                <h1
                  className="font-display leading-none"
                  style={{
                    fontWeight: 700,
                    fontSize: '24px',
                    letterSpacing: '-0.01em',
                    color: '#fff',
                    textShadow: '0 2px 0 #2a5680, 0 3px 4px rgba(42,52,69,0.25)',
                  }}
                >
                  Birder
                </h1>
                <p
                  className="font-sans mt-1"
                  style={{
                    fontWeight: 700,
                    fontSize: '10px',
                    color: '#fff',
                    opacity: 0.92,
                    letterSpacing: '0.08em',
                    textShadow: '0 1px 0 #2a5680',
                  }}
                >
                  YOUR LIFE LIST
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#fff', border: '2.5px solid #2a5680',
                boxShadow: '0 3px 0 0 #2a5680',
                color: '#2a5680',
              }}
            >
              <Settings size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Friendly greeting strip — only when we have data */}
          {!empty && hydrated && csvMeta?.latest && (
            <div
              className="relative mt-3 flex items-center gap-2 px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.55)',
                border: '2px solid #2a5680',
                borderRadius: 12,
              }}
            >
              <Sparkle size={18} className="flex-shrink-0" />
              <p className="font-display text-xs sm:text-sm" style={{ fontWeight: 500, color: '#2a5680' }}>
                Hey! Latest entry was {fmtDate(csvMeta.latest)}.
              </p>
            </div>
          )}
        </header>

        {empty && (
          <div className="anim-2">
            <div className="text-center mb-12">
              <div className="stamp mb-6">Get Started</div>
              <h2 className="font-display text-4xl sm:text-5xl ink mb-4 leading-[1.05]" style={{ fontWeight: 700 }}>
                How many of America's<br />
                <span className="rust">{TOTAL}</span> native birds<br />
                have you seen?
              </h2>
              <p className="ink-soft max-w-md mx-auto leading-relaxed">
                Upload your eBird data to find out. The denominator is fixed: every native,
                regularly-occurring bird species in the ABA Area, counted once.
              </p>
            </div>

            <div className="max-w-md mx-auto mb-6">
              <div className="surface-1 rounded-2xl p-6 relative">
                <div className="absolute top-4 right-4 font-mono text-[10px] ink-faint tracking-widest">CSV</div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(249,115,22,0.10)' }}>
                  <FileText size={20} strokeWidth={2} className="rust" />
                </div>
                <h3 className="font-display text-lg ink mb-2" style={{ fontWeight: 600 }}>Your sightings</h3>
                <p className="text-sm ink-soft mb-5 leading-relaxed">
                  At <span className="font-mono text-xs ink">ebird.org</span>: My eBird → Download My Data.
                  You'll be emailed a CSV — upload it here.
                </p>
                {/* Upload CSV — uses an "input overlay" pattern. The file
                    input sits as a fully-transparent layer ON TOP of a
                    decorative button-styled <span>, sized to fill it. The
                    user's tap goes directly to the input element, no label
                    forwarding, no programmatic .click(), no display:none
                    wizardry. This is the most reliable iOS Safari standalone
                    PWA pattern — every other approach (display:none + ref
                    click, label-wraps-input, button + sibling input) has
                    edge cases on at least one iOS version. Putting the
                    input ON TOP of the visual means iOS treats every tap
                    as a direct, user-initiated file input activation, which
                    has the strongest "user gesture" preservation. */}
                <div className="relative inline-flex">
                  <span
                    className="btn-ink rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2 select-none"
                    style={{ pointerEvents: 'none', opacity: loading ? 0.6 : 1 }}
                    aria-hidden="true"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    {loading ? 'Reading…' : 'Upload CSV'}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
                    onChange={(e) => { onCsvFile(e.target.files?.[0]); e.target.value = ''; }}
                    disabled={loading}
                    aria-label="Upload CSV"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      // Suppress iOS's default native styling that can size
                      // the input larger than its container and offset the
                      // tap target.
                      fontSize: 0,
                    }}
                  />
                </div>
              </div>
            </div>

            {!isInstalled && (
              <div className="mt-6 mb-3 text-center">
                <button
                  onClick={handleInstall}
                  className="btn-ghost rounded-full px-5 py-2 text-xs inline-flex items-center gap-2"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add Birder to your home screen
                </button>
              </div>
            )}

            <div className="text-center text-xs ink-faint flex items-center justify-center gap-3 flex-wrap">
              <button onClick={openAllSpecies} className="hover:ink transition-colors">
                Browse the list of {TOTAL}
              </button>
              <span>·</span>
              <button onClick={() => setShowAbout(true)} className="hover:ink transition-colors">
                What's the {TOTAL}?
              </button>
              <span>·</span>
              <span>Stored locally</span>
            </div>
          </div>
        )}

        {!empty && hydrated && (
          <main className="flex-1 flex flex-col">
            {/* The hero card, collection grid, and CTAs sit in a flex group
                that grows to fill the screen, distributing leftover vertical
                space evenly between sections (justify-between) so the layout
                fits one viewport on any device height. The footer below is
                pushed past the fold on short screens. */}
            <div className="flex-1 flex flex-col justify-between gap-2" style={{ minHeight: 0 }}>
            {/* ===== Hero count card — TAPPABLE =====
                The whole card is a button. Tap anywhere on it to open the
                full species index. Visually identical to the previous div
                version (chunky white card, coral hero number with offset
                text-shadow, rainbow progress bar) — just rendered as a
                <button> with text-align center and matching styles. A small
                "tap to browse" microcopy sits beside the % complete line
                so the affordance is discoverable without a chevron crowding
                the hero number.
                ===== */}
            <button
              type="button"
              onClick={openAllSpecies}
              aria-label="Browse all 774 species"
              className="anim-2 relative w-full block text-center lift"
              style={{
                background: 'linear-gradient(180deg, #fff 0%, #fff8e8 100%)',
                border: '3px solid #2a3445',
                boxShadow: '0 5px 0 0 #2a3445',
                borderRadius: 22,
                padding: 'clamp(6px, 1.5dvh, 12px) 20px',
                cursor: 'pointer',
              }}
            >
              {/* Star badge popping out of the top-right corner */}
              <div
                className="absolute"
                style={{
                  top: -10, right: 18, width: 28, height: 28,
                  background: '#ffe066',
                  border: '2.5px solid #c9a01a',
                  borderRadius: '50%',
                  boxShadow: '0 3px 0 0 #c9a01a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#c9a01a', fontWeight: 900, fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ★
              </div>

              {/* "Life List" pill */}
              <div className="inline-flex" style={{ marginBottom: 10 }}>
                <span
                  className="font-display"
                  style={{
                    background: '#5fa8d3', color: '#fff',
                    fontWeight: 700, fontSize: 11,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: 999,
                    border: '2px solid #2a5680',
                    boxShadow: '0 2px 0 0 #2a5680',
                    textShadow: '0 1px 0 #2a5680',
                  }}
                >
                  Life List
                </span>
              </div>

              {/* The big coral 204 with offset text-shadow */}
              <div className="flex items-baseline justify-center gap-2 flex-wrap">
                <div
                  className="font-display"
                  style={{
                    fontWeight: 700,
                    fontSize: 'clamp(2.5rem, min(16vw, 9dvh), 6rem)',
                    lineHeight: 0.95,
                    lineHeight: 0.92,
                    color: '#ff6b6b',
                    textShadow: '0 4px 0 #a83a3a, 0 5px 8px rgba(40,30,60,0.2)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {userCount != null ? fmt(userCount) : '—'}
                </div>
                <div
                  className="font-display"
                  style={{ fontWeight: 600, fontSize: '1.25rem', color: '#7a6a55' }}
                >
                  / {fmt(TOTAL)}
                </div>
              </div>

              {/* Rainbow progress bar */}
              <div
                className="mt-3 mx-auto"
                style={{
                  width: '88%', height: 12, borderRadius: 999,
                  background: '#f4e4c8',
                  border: '2px solid #2a3445',
                  overflow: 'hidden', position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(progressAnim * 100).toFixed(1)}%`,
                    background: 'linear-gradient(90deg, #7dd3a4, #5fa8d3, #ffe066, #ff7e7e)',
                    borderRadius: 999,
                    transition: 'width 0.6s ease-out',
                  }}
                />
              </div>
              <div
                className="font-display"
                style={{
                  fontWeight: 600, fontSize: 12, color: '#7a6a55',
                  marginTop: 8, letterSpacing: '0.02em',
                }}
              >
                <span style={{ color: '#ff6b6b', fontWeight: 700 }}>
                  {pct != null ? `${pct.toFixed(1)}%` : '—'}
                </span>
                {' complete · '}
                {remaining != null ? `${fmt(remaining)} to go!` : ''}
              </div>
              {/* Tap-to-browse microcopy — small, low-key, sits inside the
                  card so the button feels deliberate without an extra
                  affordance fighting the hero number. */}
              <div
                className="font-sans inline-flex items-center justify-center gap-1.5 mt-2"
                style={{
                  fontWeight: 700, fontSize: 10, color: '#7a6a55',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  opacity: 0.75,
                }}
              >
                <List size={11} strokeWidth={2.5} />
                Tap to browse the full list
              </div>
            </button>

            {/* "Your collection" section title with yellow accent dot */}
            <div className="anim-5 flex items-center gap-2">
              <span
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#ffe066', border: '2px solid #c9a01a',
                  display: 'inline-block',
                }}
              />
              <h2 className="font-display" style={{ fontWeight: 600, fontSize: 15, color: '#2a3445', letterSpacing: '0.01em' }}>
                Your collection
              </h2>
            </div>

            {/* ===== Color-coded chunky stat tiles =====
                Five color themes (mint/coral/sky/lemon/peach) one per tile.
                Each tile is a chunky rounded card with thick dark border +
                offset shadow + colored fill + illustrated icon.
                ===== */}
            <div className="grid grid-cols-2 gap-2.5 anim-5">
              {/* Observations (sky theme) */}
              <div
                style={{
                  background: '#d8eef9', border: '2.5px solid #2a5680',
                  boxShadow: '0 4px 0 0 #2a5680', borderRadius: 18,
                  padding: 'clamp(8px, 1.5dvh, 12px) 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <ChecklistIcon size={32} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Checklists
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: '#2a3445', lineHeight: 1 }}>
                      {csvMeta ? fmt(csvMeta.checklists ?? csvMeta.observations) : '—'}
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  since {csvMeta?.earliest ? fmtDate(csvMeta.earliest) : '—'}
                </div>
              </div>

              {/* Families (mint theme) — tap to open the families drawer */}
              <button
                onClick={() => setShowFamilies(true)}
                aria-label="View all bird families"
                className="text-left lift"
                style={{
                  background: '#d8f3df', border: '2.5px solid #2e6b4f',
                  boxShadow: '0 4px 0 0 #2e6b4f', borderRadius: 18,
                  padding: 'clamp(8px, 1.5dvh, 12px) 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <TreeIcon size={28} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Families
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: '#2a3445', lineHeight: 1 }}>
                      {familiesSeen}<span style={{ fontSize: 13, color: '#7a6a55', fontWeight: 600, marginLeft: 3 }}>/{TOTAL_FAMILIES}</span>
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  tap to browse
                </div>
              </button>

              {/* At-risk (coral theme) — tap to open at-risk list */}
              <button
                onClick={openAtRiskList}
                aria-label="View at-risk native species"
                className="text-left lift"
                style={{
                  background: '#ffe0d4', border: '2.5px solid #a83a3a',
                  boxShadow: '0 4px 0 0 #a83a3a', borderRadius: 18,
                  padding: 'clamp(8px, 1.5dvh, 12px) 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <HeartIcon size={28} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      At-risk
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 24, color: '#2a3445', lineHeight: 1 }}>
                      {atRiskSeen}<span style={{ fontSize: 13, color: '#7a6a55', fontWeight: 600, marginLeft: 3 }}>/{TOTAL_AT_RISK}</span>
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  IUCN threatened
                </div>
              </button>

              {/* Latest (lemon theme) */}
              <div
                style={{
                  background: '#fff3c4', border: '2.5px solid #c9a01a',
                  boxShadow: '0 4px 0 0 #c9a01a', borderRadius: 18,
                  padding: 'clamp(8px, 1.5dvh, 12px) 14px',
                }}
              >
                <div className="flex items-start gap-2">
                  <CalendarIcon size={28} className="flex-shrink-0" />
                  <div>
                    <div className="font-display" style={{ fontWeight: 600, fontSize: 11, color: '#5a4a3e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                      Latest
                    </div>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 18, color: '#2a3445', lineHeight: 1 }}>
                      {csvMeta?.latest ? fmtDate(csvMeta.latest) : '—'}
                    </div>
                  </div>
                </div>
                <div className="font-sans" style={{ fontWeight: 600, fontSize: 10, color: '#7a6a55', marginTop: 5 }}>
                  most recent entry
                </div>
              </div>
            </div>

            {/* ===== Tertiary action row — Find Missed Birds =====
                Browse-all moved up under the hero. This row now holds only
                the eBird-API-powered "find missed birds" affordance (and any
                future tools we add). */}
            {/* ===== Map CTA — chunky green pill (the big "go explore" button) ===== */}
            {points && points.length > 0 && (
              <button
                onClick={() => setView('map')}
                className="anim-5 w-full inline-flex items-center justify-between gap-3"
                style={{
                  background: 'linear-gradient(180deg, #7dd3a4 0%, #5cba87 100%)',
                  border: '3px solid #2e6b4f',
                  boxShadow: '0 5px 0 0 #2e6b4f',
                  borderRadius: 20,
                  padding: '11px 18px',
                  color: '#fff',
                }}
              >
                <div className="flex items-center gap-3">
                  <Compass size={42} className="flex-shrink-0" />
                  <div className="text-left">
                    <div
                      className="font-display"
                      style={{
                        fontWeight: 700, fontSize: 18, letterSpacing: '0.01em',
                        textShadow: '0 1.5px 0 #2e6b4f', lineHeight: 1,
                      }}
                    >
                      My Map
                    </div>
                    <div
                      className="font-sans"
                      style={{
                        fontWeight: 600, fontSize: 11, marginTop: 3,
                        color: '#e0fff0',
                      }}
                    >
                      {csvMeta?.locationCount ? fmt(csvMeta.locationCount) : '—'} sites · 11 regions
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#fff', border: '2.5px solid #2e6b4f',
                    boxShadow: '0 2px 0 0 #2e6b4f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2e6b4f',
                    fontWeight: 700, fontSize: 18,
                  }}
                >
                  ›
                </div>
              </button>
            )}

            {/* ===== Badges CTA — chunky gold pill ===== */}
            {points && points.length > 0 && (
              <button
                onClick={() => setView('badges')}
                className="anim-5 w-full inline-flex items-center justify-between gap-3"
                style={{
                  background: 'linear-gradient(135deg, #ffd97a 0%, #ffe9a8 100%)',
                  border: '3px solid #2a3445',
                  boxShadow: '0 5px 0 0 #2a3445',
                  borderRadius: 20,
                  padding: '11px 18px',
                  color: '#2a3445',
                }}
              >
                <div className="flex items-center gap-3">
                  <Trophy size={40} className="flex-shrink-0" strokeWidth={2} />
                  <div className="text-left">
                    <div
                      className="font-display"
                      style={{ fontWeight: 700, fontSize: 18, letterSpacing: '0.01em', lineHeight: 1 }}
                    >
                      Badges
                    </div>
                    <div
                      className="font-sans"
                      style={{ fontWeight: 600, fontSize: 11, marginTop: 3, color: '#6b5a2e' }}
                    >
                      Achievements & milestones
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#fff', border: '2.5px solid #2a3445',
                    boxShadow: '0 2px 0 0 #2a3445',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#2a3445', fontWeight: 700, fontSize: 18,
                  }}
                >
                  ›
                </div>
              </button>
            )}

            {/* Find missed birds — moved below the Map & Badges CTAs (so those
                two are the prominent actions) and centered. */}
            <div className="anim-5 flex justify-center">
              {userCount != null && (
                <button
                  onClick={() => setShowTips(true)}
                  className="btn-ghost rounded-full px-4 py-2 text-sm inline-flex items-center gap-2"
                >
                  <Search size={14} strokeWidth={2.5} />
                  Find missed birds
                </button>
              )}
            </div>

            </div>
            {/* below-the-fold supplementary content: excluded-species note +
                footer. Not part of the space-distributing flex group. */}
            {csvMeta?.allCount != null && userCount != null && csvMeta.allCount > userCount && (
              <div className="mt-6 anim-5">
                <div className="text-xs ink-soft leading-relaxed">
                  Your CSV holds <span className="font-mono ink">{fmt(csvMeta.allCount)}</span> distinct US species in total
                  — <span className="font-mono ink">{fmt(csvMeta.allCount - userCount)}</span> are excluded from the count
                  as introduced exotics or rare visitors from other continents.
                </div>
              </div>
            )}

            {/* footer — sits after the flex group, naturally below the fold on
                short screens (it's not part of the space-distributing group). */}
            <div className="mt-6 pt-5 border-t rule flex flex-wrap items-center justify-between gap-4 anim-5">
              <div className="font-mono text-[10px] ink-faint tracking-wider">
                <div>Updated <span className="ink-soft">{csvMeta ? relativeTime(csvMeta.updatedAt) : '—'}</span></div>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <button onClick={() => setShowAbout(true)} className="ink-soft hover:ink transition-colors">about the {TOTAL}</button>
                  {!isInstalled && (
                    <>
                      <span className="ink-faint">·</span>
                      <button onClick={handleInstall} className="ink-soft hover:ink transition-colors">add to home screen</button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Re-upload CSV — see overlay pattern note on the empty-state
                    Upload CSV button above. */}
                <div className="relative inline-flex">
                  <span
                    className="btn-ghost rounded-full px-3.5 py-2 text-xs inline-flex items-center gap-1.5 select-none"
                    style={{ pointerEvents: 'none', opacity: loading ? 0.6 : 1 }}
                    aria-hidden="true"
                  >
                    {loading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}
                    Re-upload CSV
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
                    onChange={(e) => { onCsvFile(e.target.files?.[0]); e.target.value = ''; }}
                    disabled={loading}
                    aria-label="Re-upload CSV"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      fontSize: 0,
                    }}
                  />
                </div>
              </div>
            </div>
          </main>
        )}

        <footer className="mt-16 pt-6 border-t rule text-center anim-5">
          <p className="font-mono text-[9px] ink-faint tracking-[0.25em] uppercase leading-relaxed">
            Sightings · ebird (Cornell Lab of Ornithology)<br />
            Total · ABA Checklist v8.0.7
          </p>
        </footer>
      </div>
      )}

      {view === 'map' && (
        <SightingsMapView
          pointsAll={points || []}
          pointsFirst={firstSightingPoints}
          userCount={userCount}
          familiesSeen={familiesSeen}
          code3Seen={code3Seen}
          atRiskSeen={atRiskSeen}
          locationCount={csvMeta?.locationCount || (points?.length ?? 0)}
          regionNativeCount={csvMeta?.regionNativeCount || {}}
          locations={locations || []}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'badges' && (
        <BadgesView
          seenSci={seenSci}
          userCount={userCount}
          atRiskSeen={atRiskSeen}
          regionNativeCount={csvMeta?.regionNativeCount || {}}
          speciesStats={csvMeta?.speciesStats || {}}
          usNonNativeCount={csvMeta?.usNonNativeCount || 0}
          onBack={() => setView('dashboard')}
        />
      )}

      {/* toasts */}
      {(error || success) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 toast z-50 max-w-md w-[90%]">
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
               style={{
                 background: error ? '#ffe0d4' : '#d8f3df',
                 border: `2.5px solid ${error ? '#a83a3a' : '#2e6b4f'}`,
                 boxShadow: `0 4px 0 0 ${error ? '#a83a3a' : '#2e6b4f'}`,
                 color: '#2a3445',
               }}>
            {error
              ? <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#a83a3a' }} />
              : <Check size={18} className="shrink-0 mt-0.5" style={{ color: '#2e6b4f' }} />}
            <div className="flex-1 text-sm leading-relaxed font-sans font-semibold">{error || success}</div>
            <button onClick={() => { setError(null); setSuccess(null); }} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* families drawer — rendered first so the species drawer (when both are
          open via a family drilldown) stacks on top */}
      {showFamilies && (
        <FamiliesDrawer
          seenSci={seenSci}
          onClose={() => setShowFamilies(false)}
          onFamilyClick={(family) => openFamilyList(family)}
        />
      )}

      {/* species list drawer — accepts optional title/subtitle/eyebrow/restrictFn
          via the listFilter object, set when opening from a stat card or family */}
      {showList && (
        <SpeciesListDrawer
          seenSci={seenSci}
          speciesStats={csvMeta?.speciesStats || {}}
          onClose={() => { setShowList(false); }}
          {...(listFilter || {})}
        />
      )}

      {/* tips drawer — eBird API hints for missed species at visited hotspots */}
      {showTips && (
        <TipsDrawer
          apiKey={apiKey}
          locations={locations}
          seenSci={seenSci}
          onClose={() => setShowTips(false)}
          onOpenSettings={() => { setShowTips(false); setShowSettings(true); }}
        />
      )}

      {/* install prompt drawer (manual instructions for iOS / browsers without programmatic install) */}
      {showInstall && <InstallPromptDrawer onClose={() => setShowInstall(false)} />}

      {/* settings drawer */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setShowSettings(false)}>
          <div
            className="surface-2 rounded-2xl max-w-md w-full p-7 relative"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 ink-soft hover:ink transition-colors">
              <X size={18} />
            </button>
            <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Settings</div>
            <h2 className="font-display ink text-2xl mb-6" style={{ fontWeight: 700 }}>Configuration</h2>

            <label className="block mb-6">
              <span className="font-mono text-[10px] ink-faint tracking-widest uppercase block mb-2">Re-upload CSV</span>
              <input
                type="file"
                accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
                className="text-xs ink-soft block w-full file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#ff6b6b] file:text-white file:cursor-pointer hover:file:bg-[#ff8888]"
                onChange={(e) => { onCsvFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              {csvMeta && (
                <span className="text-xs ink-faint mt-2 block">
                  Current: {csvMeta.fileName || 'data.csv'} · {fmt(csvMeta.observations)} obs · {relativeTime(csvMeta.updatedAt)}
                </span>
              )}
            </label>

            <div className="border-t rule my-6" />

            <label className="block mb-6">
              <span className="font-mono text-[10px] ink-faint tracking-widest uppercase block mb-2 flex items-center justify-between">
                <span>eBird API key</span>
                {apiKey && (
                  <span className="moss font-mono text-[10px]" style={{ fontWeight: 600 }}>● Connected</span>
                )}
              </span>
              <input
                type="text"
                defaultValue={apiKey || ''}
                onBlur={(e) => saveApiKey(e.target.value)}
                placeholder="optional · enables missed-bird tips"
                className="input-field rounded-lg px-3 py-2 text-sm w-full font-mono"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="text-xs ink-faint mt-2 block leading-relaxed">
                Get a free key at{' '}
                <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener noreferrer" className="rust underline">
                  ebird.org/api/keygen
                </a>{' '}
                · stored locally on this device only · used to fetch recent observations at your hotspots
                {apiKey && (
                  <>
                    <br />
                    <button onClick={() => saveApiKey('')} className="rust underline mt-1">Clear key</button>
                  </>
                )}
              </span>
            </label>

            <div className="border-t rule my-6" />

            <div className="space-y-1">
              <button
                onClick={() => { openAllSpecies(); setShowSettings(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
              >
                Browse all {TOTAL} species →
              </button>
              {points && points.length > 0 && (
                <button
                  onClick={() => { setView('map'); setShowSettings(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
                >
                  Sightings map →
                </button>
              )}
              {userCount != null && (
                <button
                  onClick={() => { setShowTips(true); setShowSettings(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
                >
                  Find missed birds →
                </button>
              )}
              <button
                onClick={() => { setShowAbout(true); setShowSettings(false); }}
                className="block w-full text-left px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors"
              >
                About the {TOTAL} →
              </button>
            </div>

            <div className="border-t rule my-6" />

            {/* Taxonomy diagnostic. Lists scientific names in the user's CSV
                that we didn't recognize as native US species. Most are real
                exotics (House Sparrow, Eurasian Collared-Dove, etc.) that are
                correctly excluded — but the list also catches AOS/Clements
                taxonomy updates the app hasn't absorbed yet (e.g. cormorants
                moving from Phalacrocorax to Urile/Nannopterum in 2021). If
                you see a recognizable native bird here, that's a bug in the
                app's checklist worth reporting. */}
            {Array.isArray(csvMeta?.unrecognizedSci) && csvMeta.unrecognizedSci.length > 0 && (
              <>
                <details className="block group">
                  <summary className="cursor-pointer list-none flex items-center justify-between px-3 py-2 rounded-lg ink-soft hover:ink hover:bg-white/5 text-sm transition-colors">
                    <span>
                      <span className="rust font-mono" style={{ fontWeight: 600 }}>{csvMeta.unrecognizedSci.length}</span>
                      {' '}unmatched species in CSV
                    </span>
                    <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-2 mb-2 px-3 py-3 rounded-lg bg-black/20 text-xs leading-relaxed">
                    <p className="ink-faint mb-3">
                      Scientific names from your CSV that aren't on the app's
                      native checklist. Many are correctly excluded as
                      naturalized non-natives (House Sparrow, European Starling,
                      etc.). Others may indicate AOS taxonomy updates the app
                      needs — if a real native shows up here, that's a bug.
                    </p>
                    <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
                      {csvMeta.unrecognizedSci.map((u, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="ink truncate" style={{ fontWeight: 500 }}>
                              {u.com || u.sci}
                            </div>
                            <div className="font-mono text-[10px] ink-faint italic truncate">{u.sci}</div>
                          </div>
                          <div className="font-mono text-[10px] ink-faint shrink-0">×{u.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                <div className="border-t rule my-6" />
              </>
            )}

            <div className="flex items-center justify-between gap-3">
              <button onClick={resetAll} className="text-xs rust hover:underline">Clear all data</button>
              <button onClick={() => setShowSettings(false)} className="btn-ink rounded-full px-5 py-2 text-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* about drawer */}
      {showAbout && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={() => setShowAbout(false)}>
          <div
            className="surface-2 rounded-2xl max-w-lg w-full p-7 relative max-h-[85vh] overflow-y-auto"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 ink-soft hover:ink transition-colors">
              <X size={18} />
            </button>
            <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Methodology</div>
            <h2 className="font-display ink text-3xl mb-1" style={{ fontWeight: 700 }}>Why <span className="rust">{TOTAL}</span>?</h2>
            <p className="ink-soft text-sm mb-6">A derivation</p>

            <div className="text-sm ink-soft leading-relaxed space-y-3">
              <p>
                The starting point is the <span className="ink">ABA Checklist v8.0.7</span> — the American Birding
                Association's official catalogue of every species reliably documented in the ABA Area
                (lower 48, Alaska, Hawaii, Canada). Total: <span className="font-mono ink">1,120 species</span>.
              </p>
              <p>Each species is assigned a code 1–6 by the ABA Checklist Committee:</p>
              <div className="font-mono text-xs pl-2 space-y-1 my-3">
                <div><span className="rust">1–2</span> · regular breeders & visitors</div>
                <div><span className="rust">3</span> · rare but annual</div>
                <div className="ink-faint">4 · casual (less than annual) ← excluded</div>
                <div className="ink-faint">5 · accidental (very few records) ← excluded</div>
                <div className="ink-faint">6 · extinct or extirpated ← excluded</div>
              </div>
              <p>
                Codes 4 and 5 are where things like Steller's Sea-Eagle live — exciting finds, but
                not "America's birds" in any meaningful sense. Excluding them leaves <span className="font-mono ink">826</span>.
              </p>
              <p>
                Then the established exotics get pulled out — the <span className="font-mono ink">52</span> species
                on the ABA's separate Introduced Species list whose entire ABA-Area
                presence is non-native: House Sparrow, European Starling, Rock Pigeon, all the Hawaiian
                introductions, Eurasian Collared-Dove, naturalized parrots, and so on.
              </p>
              <p className="font-display py-2" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                <span className="font-mono ink">826 − 52 = </span>
                <span className="rust">{TOTAL}</span>
              </p>
              <p>
                Species native to the mainland US that were also introduced to Hawaii — Mallard, Wild
                Turkey, Northern Cardinal, House Finch, etc. — are kept, since they have legitimate
                native US populations. Cattle Egret stays (self-introduced naturally from Africa via South
                America). California Condor stays (native, reintroduced).
              </p>
              <p>
                Your uploaded CSV is filtered against this exact {TOTAL}-species list by scientific name, so
                rare vagrants and invasives you've recorded are noted but don't push the percentage above 100.
              </p>
              <div className="border-t rule my-4" />
              <p className="text-xs ink-faint">
                Sources:<br />
                <span className="font-mono">aba.org/aba-checklist</span><br />
                <span className="font-mono">aba.org/aba-area-introduced-species</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {!hydrated && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #6cb8e4 0%, #a8d8eb 40%, #f8d9a8 100%)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <BluebirdMascot size={56} className="animate-pulse" />
            <div className="font-display text-sm" style={{ color: '#2a5680', fontWeight: 600, letterSpacing: '0.1em' }}>
              loading…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Species detail card — tap a species row to see scientific/common name, IUCN
// status, movement (migratory/resident), regions (seen-in now; true range
// later), a quick fact (generated later), ABA rarity, and personal sighting
// stats. Movement/range/fact read from the stubbed SPECIES_* maps and degrade
// to "coming soon"/"unknown" until that data-generation pass is done.
// ============================================================================
function SpeciesDetailCard({ species, seenSci, speciesStats, onClose }) {
  if (!species) return null;
  const [common, sci] = species;
  const seen = seenSci.has(sci);
  const family = SCI_TO_FAMILY.get(sci) || 'Other';
  const iucn = IUCN_STATUS[sci]; // undefined → Least Concern
  const code3 = CODE_3_SCI.has(sci);
  const pelagic = isPelagicSci(sci);
  const nocturnal = isNocturnalSci(sci);
  const specialized = isSpecializedSci(sci);
  const movement = SPECIES_MOVEMENT[sci]; // undefined → coming soon
  const trueRange = SPECIES_RANGE[sci];   // undefined → coming soon
  const fact = SPECIES_FACTS[sci];        // undefined → coming soon
  const stats = (speciesStats && speciesStats[sci]) || null;

  const iucnBadgeColor =
    iucn === 'CR' ? '#a83a3a' :
    iucn === 'EN' ? '#ff6b6b' :
    iucn === 'VU' ? '#c9a01a' :
    iucn === 'NT' ? '#7a6a55' : '#8a8073'; // LC
  const iucnText = iucn ? IUCN_LABEL[iucn] : 'Least Concern';
  const iucnCode = iucn || 'LC';

  const seenRegionNames = (stats?.regions || [])
    .map((id) => REGION_BY_ID[id]?.name)
    .filter(Boolean);

  const firstSeenShort = stats?.first
    ? new Date(stats.first).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(42,52,69,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: 360, maxHeight: '90vh', background: '#fff8e8',
          border: '3px solid #2a3445', borderRadius: 22,
          boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* scrollable body */}
        <div className="overflow-y-auto">
          {/* header — sky gradient */}
          <div style={{ background: 'linear-gradient(180deg,#6cb8e4 0%,#a8d8eb 60%,#bfe0d4 100%)', padding: '16px 16px 14px', position: 'relative' }}>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', background: '#fff8e8', border: '2.5px solid #2a3445', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3445' }}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: seen ? '#5cba87' : '#e8dcc0', border: '2px solid #2a3445', borderRadius: 999, padding: '3px 10px', marginBottom: 10 }}>
              {seen ? <Check size={13} strokeWidth={3} style={{ color: '#10301f' }} /> : <Eye size={13} style={{ color: '#5a4a3e' }} />}
              <span style={{ fontSize: 11, fontWeight: 600, color: seen ? '#10301f' : '#5a4a3e', letterSpacing: '0.04em' }}>
                {seen ? 'on your life list' : 'not yet seen'}
              </span>
            </div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: '#16323f', lineHeight: 1.15 }}>{common}</div>
            <div className="font-mono" style={{ fontStyle: 'italic', fontSize: 12, color: '#2c5566', marginTop: 2 }}>{sci}</div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#2c5566' }}>{family}</span>
              {code3 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#7a3a10', background: '#f0c89a', border: '1.5px solid #2a3445', borderRadius: 999, padding: '1px 8px', letterSpacing: '0.03em' }}>
                  RARE · CODE 3
                </span>
              )}
              {pelagic && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#0d3b54', background: '#bfe0ef', border: '1.5px solid #2a3445', borderRadius: 999, padding: '1px 8px', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Anchor size={10} strokeWidth={2.5} /> PELAGIC
                </span>
              )}
              {nocturnal && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#2e2358', background: '#d6cdf0', border: '1.5px solid #2a3445', borderRadius: 999, padding: '1px 8px', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Moon size={10} strokeWidth={2.5} /> NOCTURNAL
                </span>
              )}
              {specialized && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#7a2e1a', background: '#f3c9b3', border: '1.5px solid #2a3445', borderRadius: 999, padding: '1px 8px', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontWeight: 800 }}>!</span> SPECIALIZED
                </span>
              )}
            </div>
          </div>

          {/* status tiles — IUCN + movement */}
          <div style={{ display: 'flex', gap: 8, padding: '12px 14px 4px' }}>
            <div style={{ flex: 1, background: '#ffe9b0', border: '2px solid #2a3445', borderRadius: 12, padding: '9px 8px' }}>
              <div style={{ fontSize: 10, color: '#7a5a1e', letterSpacing: '0.03em', marginBottom: 3 }}>IUCN STATUS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 18, padding: '0 5px', background: iucnBadgeColor, border: '1.5px solid #2a3445', borderRadius: 5, color: '#fff8e8', fontSize: 11, fontWeight: 600 }}>{iucnCode}</span>
                <span style={{ fontSize: 11.5, color: '#2a3445', fontWeight: 600 }}>{iucnText}</span>
              </div>
            </div>
            <div style={{ flex: 1, background: '#cdeafe', border: '2px solid #2a3445', borderRadius: 12, padding: '9px 8px' }}>
              <div style={{ fontSize: 10, color: '#1d5a82', letterSpacing: '0.03em', marginBottom: 3 }}>MOVEMENT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {movement === 'resident'
                  ? <Home size={15} style={{ color: '#185fa5' }} />
                  : <ArrowLeftRight size={15} style={{ color: '#185fa5' }} />}
                <span style={{ fontSize: 11.5, color: movement ? '#2a3445' : '#9a8a72', fontWeight: 600 }}>
                  {movement ? MOVEMENT_LABEL[movement] : 'Coming soon'}
                </span>
              </div>
            </div>
          </div>

          {/* regions */}
          <div style={{ padding: '8px 14px 4px' }}>
            <div style={{ fontSize: 10, color: '#8a6a45', letterSpacing: '0.05em', marginBottom: 6 }}>SEEN IN YOUR REGIONS</div>
            {seenRegionNames.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {seenRegionNames.map((name) => (
                  <span key={name} style={{ fontSize: 11, fontWeight: 600, color: '#10301f', background: '#bfe6cf', border: '1.5px solid #2a3445', borderRadius: 999, padding: '3px 10px' }}>{name}</span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: '#9a8a72', fontStyle: 'italic' }}>
                {seen ? 'No region recorded for your sightings.' : 'Not yet seen in any region.'}
              </div>
            )}

            <div style={{ fontSize: 10, color: '#8a6a45', letterSpacing: '0.05em', margin: '12px 0 6px' }}>
              FULL RANGE <span style={{ fontWeight: 600, color: '#b59a6a' }}>{trueRange ? '' : '· coming soon'}</span>
            </div>
            {trueRange ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trueRange.map((id) => (
                  <span key={id} style={{ fontSize: 11, fontWeight: 600, color: '#16323f', background: '#cfe8f5', border: '1.5px solid #2a3445', borderRadius: 999, padding: '3px 10px' }}>{REGION_BY_ID[id]?.name || id}</span>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, opacity: 0.5 }}>
                <span style={{ fontSize: 11, color: '#5a4a3e', background: '#efe4cf', border: '1.5px dashed #b59a6a', borderRadius: 999, padding: '3px 10px' }}>range data pending</span>
              </div>
            )}
          </div>

          {/* quick fact */}
          <div style={{ padding: '10px 14px 4px' }}>
            <div style={{ background: '#fffdf6', border: '2px solid #2a3445', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Lightbulb size={15} style={{ color: '#d98a2b' }} />
                <span style={{ fontSize: 10, color: '#b07a2b', letterSpacing: '0.05em', fontWeight: 600 }}>QUICK FACT</span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: fact ? '#3a3228' : '#9a8a72', fontStyle: fact ? 'normal' : 'italic' }}>
                {fact || 'A quick fact for this species is coming soon.'}
              </div>
            </div>
          </div>

          {/* personal sighting stats — only when seen */}
          {seen && stats && (
            <div style={{ padding: '12px 14px 16px' }}>
              <div style={{ fontSize: 10, color: '#8a6a45', letterSpacing: '0.05em', marginBottom: 6 }}>YOUR SIGHTINGS</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: '#fde3e3', border: '2px solid #2a3445', borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: '#a32d2d', lineHeight: 1 }}>{stats.n}</div>
                  <div style={{ fontSize: 9.5, color: '#7a4a4a', marginTop: 3 }}>sightings</div>
                </div>
                <div style={{ flex: 1, background: '#dbeefe', border: '2px solid #2a3445', borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: '#185fa5', lineHeight: 1 }}>{stats.loc}</div>
                  <div style={{ fontSize: 9.5, color: '#3a6a8a', marginTop: 3 }}>locations</div>
                </div>
                <div style={{ flex: 1, background: '#e7f3d6', border: '2px solid #2a3445', borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3b6d11', lineHeight: 1.1, marginTop: 2 }}>{firstSeenShort || '—'}</div>
                  <div style={{ fontSize: 9.5, color: '#5a7a3a', marginTop: 3 }}>first seen</div>
                </div>
              </div>
            </div>
          )}
          {!seen && <div style={{ height: 12 }} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Species list drawer — full 774-species list with checkbox states
// ============================================================================
function SpeciesListDrawer({ seenSci, onClose, title, subtitle, eyebrow, restrictType, restrictValue, speciesStats }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'seen' | 'unseen'
  const [selected, setSelected] = useState(null); // [common, sci] of tapped row

  // Derive the restriction predicate from primitive props so we never have to
  // store a closure-over-state function in the parent's state. This avoids a
  // class of bugs around stale closures and surprising re-renders.
  const restrictFn = useMemo(() => {
    if (restrictType === 'code3') return (sci) => CODE_3_SCI.has(sci);
    if (restrictType === 'atrisk') return (sci) => AT_RISK_SCI.has(sci);
    if (restrictType === 'family') return (sci) => SCI_TO_FAMILY.get(sci) === restrictValue;
    return null;
  }, [restrictType, restrictValue]);

  // Filter species (optionally to a restricted subset), then group consecutively by family.
  // Output is an array of { family, items: [[common, sci], ...] } in taxonomic order.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];
    let currentFamily = null;
    let currentGroup = null;

    for (const [common, sci] of NATIVE_SPECIES) {
      if (restrictFn && !restrictFn(sci)) continue;
      const seen = seenSci.has(sci);
      if (filter === 'seen' && !seen) continue;
      if (filter === 'unseen' && seen) continue;
      if (q && !common.toLowerCase().includes(q) && !sci.toLowerCase().includes(q)) continue;

      const fam = SCI_TO_FAMILY.get(sci) || 'Other';
      if (fam !== currentFamily) {
        currentFamily = fam;
        currentGroup = { family: fam, items: [] };
        result.push(currentGroup);
      }
      currentGroup.items.push([common, sci]);
    }
    return result;
  }, [query, filter, seenSci, restrictFn]);

  // Counts scoped to the restriction (so the header reflects what the user actually sees)
  const { totalInScope, seenInScope } = useMemo(() => {
    let total = 0, seen = 0;
    for (const [, sci] of NATIVE_SPECIES) {
      if (restrictFn && !restrictFn(sci)) continue;
      total++;
      if (seenSci.has(sci)) seen++;
    }
    return { totalInScope: total, seenInScope: seen };
  }, [seenSci, restrictFn]);

  const hideFamilyHeader = groups.length === 1; // single-family view doesn't need redundant subheader

  const displayTitle = title || `The ${TOTAL}`;
  const displayEyebrow = eyebrow || 'Species Index';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff8e8', border: '3px solid #2a3445', boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">{displayEyebrow}</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>{displayTitle}</h2>
          <p className="ink-soft text-sm mb-4">
            <span className="moss font-mono" style={{ fontWeight: 600 }}>{seenInScope}</span> recorded
            {' · '}
            <span className="ink-faint font-mono">{totalInScope - seenInScope}</span> unseen
            {subtitle && (
              <>
                {' · '}
                <span className="ink-faint">{subtitle}</span>
              </>
            )}
          </p>

          {/* filter pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {[
              ['all', `All ${totalInScope}`],
              ['seen', `Seen (${seenInScope})`],
              ['unseen', `Unseen (${totalInScope - seenInScope})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  filter === key ? 'btn-ink' : 'btn-ghost'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by common or scientific name…"
              className="input-field rounded-full pl-9 pr-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        {/* list body — note: NO top padding on the scroll container. Any
            padding-top here sits above where the sticky family header pins
            (top:0), leaving a band that species rows visibly scroll through
            above the pinned header. Top spacing is applied to the inner
            content wrapper instead, which scrolls normally. */}
        <div className="relative flex-1 overflow-y-auto px-2 sm:px-4 pb-2">
          {groups.length === 0 ? (
            <div className="text-center py-12 ink-faint text-sm">
              No matches{query ? ` for "${query}"` : ''}.
            </div>
          ) : (
            <div className="font-body pt-2">
              {groups.map(({ family, items }) => {
                const famSeen = items.filter(([, s]) => seenSci.has(s)).length;
                return (
                  <section key={family} className="mb-1">
                    {/* family subheader — hidden when the whole drawer is one family.
                        Cream sticky band with a yellow accent dot prefix, dark ink
                        text. The previous dark-green background was a holdover from
                        the legacy palette and looked wrong against the cream drawer. */}
                    {!hideFamilyHeader && (
                      <>
                        <div
                          className="sticky top-0 z-10 px-3 py-2.5 flex items-center justify-between gap-3"
                          style={{
                            background: 'rgba(255,248,232,0.96)',
                            backdropFilter: 'blur(8px)',
                            borderBottom: '1.5px solid rgba(42,52,69,0.18)',
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="shrink-0"
                              style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: '#ffe066', border: '2px solid #c9a01a',
                              }}
                            />
                            <h3 className="font-display text-base sm:text-lg truncate" style={{ fontWeight: 600, color: '#2a3445' }}>
                              {family}
                            </h3>
                          </div>
                          <span
                            className="font-mono text-[11px] tracking-wider whitespace-nowrap shrink-0"
                            style={{ fontWeight: 700, color: '#5a4a3e' }}
                          >
                            <span style={{ color: famSeen > 0 ? '#ff6b6b' : '#7a6a55' }}>{famSeen}</span>
                            <span style={{ color: '#7a6a55' }}> / {items.length}</span>
                          </span>
                        </div>
                      </>
                    )}
                    <ul>
                      {items.map(([common, sci]) => {
                        const seen = seenSci.has(sci);
                        const iucn = IUCN_STATUS[sci];
                        const badgeColor =
                          iucn === 'CR' ? '#a83a3a' :
                          iucn === 'EN' ? '#ff6b6b' :
                          iucn === 'VU' ? '#c9a01a' :
                          '#7a6a55'; // NT
                        return (
                          <li
                            key={sci}
                            className="border-b"
                            style={{ borderColor: 'rgba(42,52,69,0.08)' }}
                          >
                            <button
                              type="button"
                              onClick={() => setSelected([common, sci])}
                              className="species-row w-full text-left flex items-center gap-3 px-3 py-2.5"
                              aria-label={`View details for ${common}`}
                            >
                              {seen ? (
                                <CheckSquare size={22} strokeWidth={2} className="shrink-0" style={{ color: '#5cba87' }} />
                              ) : (
                                <Square size={22} strokeWidth={1.5} className="shrink-0" style={{ color: '#a8a294' }} />
                              )}
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-[15px] leading-tight ${seen ? 'ink' : 'ink-soft'}`}
                                  style={seen ? { fontWeight: 600 } : undefined}
                                >
                                  {common}
                                </div>
                                <div className="font-mono text-[10px] ink-faint mt-0.5 truncate" style={{ fontStyle: 'italic' }}>{sci}</div>
                              </div>
                              {iucn && (
                                <span
                                  className="font-mono text-[10px] shrink-0 px-1.5 py-0.5 rounded"
                                  style={{
                                    color: badgeColor,
                                    border: `1px solid ${badgeColor}`,
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                  }}
                                  title={
                                    iucn === 'CR' ? 'Critically Endangered' :
                                    iucn === 'EN' ? 'Endangered' :
                                    iucn === 'VU' ? 'Vulnerable' : 'Near Threatened'
                                  }
                                >
                                  {iucn}
                                </span>
                              )}
                              <ChevronRight size={16} className="shrink-0 ink-faint" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* footer count */}
        <div className="relative px-6 py-3 border-t rule flex items-center justify-between">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {groups.reduce((n, g) => n + g.items.length, 0)} shown · {groups.length} {groups.length === 1 ? 'family' : 'families'}
          </span>
          <button onClick={onClose} className="btn-ghost rounded-full px-4 py-1.5 text-xs">
            Close
          </button>
        </div>
        {/* detail card overlay */}
        {selected && (
          <SpeciesDetailCard
            species={selected}
            seenSci={seenSci}
            speciesStats={speciesStats}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}


// ============================================================================
// Families drawer — lists all 81 families with seen counts; tap to drill into
// the species list scoped to that family.
// ============================================================================
function FamiliesDrawer({ seenSci, onClose, onFamilyClick }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'started' | 'untouched'

  // Compute per-family totals & seen counts in one pass over NATIVE_SPECIES
  const families = useMemo(() => {
    const totals = new Map();
    const seens = new Map();
    for (const [, sci] of NATIVE_SPECIES) {
      const fam = SCI_TO_FAMILY.get(sci);
      if (!fam) continue;
      totals.set(fam, (totals.get(fam) || 0) + 1);
      if (seenSci.has(sci)) seens.set(fam, (seens.get(fam) || 0) + 1);
    }
    // Iterate FAMILY_BOUNDARIES to preserve taxonomic order
    const out = [];
    for (const [, family] of FAMILY_BOUNDARIES) {
      out.push({
        name: family,
        total: totals.get(family) || 0,
        seen: seens.get(family) || 0,
      });
    }
    return out;
  }, [seenSci]);

  const totalFamilies = families.length;
  const startedFamilies = families.filter(f => f.seen > 0).length;

  // Apply pill filter + search
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return families.filter(f => {
      if (filter === 'started' && f.seen === 0) return false;
      if (filter === 'untouched' && f.seen > 0) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [families, query, filter]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff8e8', border: '3px solid #2a3445', boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Diversity</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>Bird Families</h2>
          <p className="ink-soft text-sm mb-4">
            <span className="moss font-mono" style={{ fontWeight: 600 }}>{startedFamilies}</span> represented
            {' · '}
            <span className="ink-faint font-mono">{totalFamilies - startedFamilies}</span> untouched
            {' · '}
            <span className="ink-faint">tap to see species</span>
          </p>

          {/* filter pills */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {[
              ['all',       `All ${totalFamilies}`],
              ['started',   `Represented (${startedFamilies})`],
              ['untouched', `Untouched (${totalFamilies - startedFamilies})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  filter === key ? 'btn-ink' : 'btn-ghost'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search families…"
              className="input-field rounded-full pl-9 pr-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        {/* family list */}
        <div className="relative flex-1 overflow-y-auto px-2 sm:px-4 py-2">
          {visible.length === 0 ? (
            <div className="text-center py-12 ink-faint text-sm">
              No matches{query ? ` for "${query}"` : ''}.
            </div>
          ) : (
            <ul className="font-body">
              {visible.map(f => {
                const started = f.seen > 0;
                const pct = f.total > 0 ? (f.seen / f.total) * 100 : 0;
                return (
                  <li key={f.name}>
                    <button
                      onClick={() => onFamilyClick(f.name)}
                      className="species-row w-full flex items-center gap-3 px-3 py-3 border-b text-left"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      {started ? (
                        <CheckSquare size={22} strokeWidth={1.75} className="moss shrink-0" />
                      ) : (
                        <Square size={22} strokeWidth={1.5} className="ink-faint shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[15px] leading-tight truncate ${started ? 'ink' : 'ink-soft'}`}
                          style={started ? { fontWeight: 600 } : undefined}
                        >
                          {f.name}
                        </div>
                        {started && (
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #4ade80 0%, #2dd4bf 100%)',
                            }} />
                          </div>
                        )}
                      </div>
                      <div className="font-mono text-[12px] tracking-wider whitespace-nowrap" style={{ fontWeight: 600 }}>
                        <span className={started ? 'ink' : 'ink-faint'}>{f.seen}</span>
                        <span className="ink-faint"> / {f.total}</span>
                      </div>
                      <ChevronRight size={16} className="ink-faint shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="relative px-6 py-3 border-t rule">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {visible.length} of {totalFamilies} families shown
          </span>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Tips drawer — fetches eBird's recent observations at the user's visited
// hotspots, then surfaces native species they've never seen elsewhere. Each
// hotspot's response is cached for 30 days, so repeat opens are instant.
// ============================================================================
function TipsDrawer({ apiKey, locations, seenSci, onClose, onOpenSettings }) {
  const [tips, setTips] = useState(null); // null=not loaded, []=empty result, [...]=results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  // Filter to locations the user has actually birded at (5+ native species).
  // This trims out drive-by checklists and keeps focus on their "patches".
  const targetLocations = useMemo(() => {
    if (!locations) return [];
    return locations
      .filter((l) => l.id && l.id.startsWith('L') && (l.species?.length || 0) >= 5)
      .sort((a, b) => (b.species?.length || 0) - (a.species?.length || 0));
  }, [locations]);

  // On first open, assemble tips from any cached historic-day data. Anything
  // not in cache is simply absent from the result — the user fetches to fill
  // it in. This makes drawer reopens instant when the cache is warm.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!targetLocations.length) {
        setTips([]);
        return;
      }
      const dates = lastNDays(7);
      const observersByKey = new Map();
      let cachedAny = false;
      let oldestTs = null;

      for (const loc of targetLocations) {
        for (const date of dates) {
          const raw = await storage.get(`ebird:hist:${loc.id}:${date.dateStr}`);
          if (!raw || !raw.timestamp) continue;
          if (Date.now() - raw.timestamp > HISTORIC_TTL_MS) continue;
          cachedAny = true;
          if (!oldestTs || raw.timestamp < oldestTs) oldestTs = raw.timestamp;
          for (const o of (raw.data || [])) {
            aggregateObservation(loc, o, observersByKey);
          }
        }
      }
      if (cancelled) return;

      if (!cachedAny) {
        setTips(null); // signal "not fetched yet"
        return;
      }

      const verified = [];
      for (const entry of observersByKey.values()) {
        if (entry.observers.size >= 2) verified.push(entry);
      }
      setTips(buildTipsFromVerified(verified));
      setCacheTimestamp(oldestTs);
    })();
    return () => { cancelled = true; };
  }, [targetLocations.length]);

  // Builds a list of the last N days as {year, month, day, dateStr} objects.
  function lastNDays(n) {
    const out = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      out.push({ year: y, month: m, day, dateStr });
    }
    return out;
  }

  // Add a single historic observation record into the (hotspot, species) map.
  // Pulled out so the on-mount cache load and the fresh fetch path share logic.
  function aggregateObservation(loc, o, observersByKey) {
    if (!o.sciName || !NATIVE_SCI.has(o.sciName)) return;
    if (seenSci.has(o.sciName)) return;
    const key = `${loc.id}|${o.sciName}`;
    let entry = observersByKey.get(key);
    if (!entry) {
      entry = {
        sciName: o.sciName,
        comName: o.comName || o.sciName,
        observers: new Set(),
        mostRecent: o.obsDt,
        locId: loc.id,
        locName: loc.name || loc.id,
      };
      observersByKey.set(key, entry);
    }
    // Prefer userDisplayName (the human-readable submitter); fall back to subId
    // (the unique checklist ID) when the name is suppressed by privacy settings
    // or missing from older records.
    const obsKey = o.userDisplayName
      ? `n:${o.userDisplayName}`
      : (o.subId ? `s:${o.subId}` : null);
    if (obsKey) entry.observers.add(obsKey);
    if (o.obsDt && o.obsDt > entry.mostRecent) entry.mostRecent = o.obsDt;
  }

  async function fetchAll(forceRefresh = false) {
    if (!apiKey) {
      setError('Add your eBird API key in Settings first.');
      return;
    }
    if (!targetLocations.length) return;

    setLoading(true);
    setError(null);

    try {
      // Build the task list: each hotspot × each of the last 7 days. We use
      // the historic-day endpoint because every other "recent" endpoint dedupes
      // to one observation per species per location, which makes counting
      // independent observers impossible. Historic returns every individual
      // submission for that hotspot on that date — exactly what we need.
      const DAYS = 7;
      const dates = lastNDays(DAYS);
      const tasks = [];
      for (const loc of targetLocations) {
        for (const date of dates) {
          tasks.push({ loc, date });
        }
      }

      setProgress({ phase: 'verify', done: 0, total: tasks.length });

      const observersByKey = new Map();
      const concurrency = 3;

      for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        const results = await Promise.all(batch.map(async (t) => {
          let hist = forceRefresh ? null : await getCachedHistoric(t.loc.id, t.date.dateStr);
          if (!hist) {
            try {
              hist = await fetchHistoricAtLocation(
                t.loc.id, t.date.year, t.date.month, t.date.day, apiKey
              );
              await setCachedHistoric(t.loc.id, t.date.dateStr, hist);
            } catch (e) {
              console.warn('historic fetch failed for', t.loc.id, t.date.dateStr, e);
              hist = [];
            }
          }
          return { loc: t.loc, hist };
        }));

        for (const { loc, hist } of results) {
          for (const o of hist) {
            aggregateObservation(loc, o, observersByKey);
          }
        }

        setProgress({
          phase: 'verify',
          done: Math.min(i + concurrency, tasks.length),
          total: tasks.length,
        });
        await new Promise((r) => setTimeout(r, 60));
      }

      // Filter to species seen by 2+ distinct observers at the same hotspot.
      const verified = [];
      for (const entry of observersByKey.values()) {
        if (entry.observers.size >= 2) verified.push(entry);
      }

      setTips(buildTipsFromVerified(verified));
      setCacheTimestamp(Date.now());
    } catch (e) {
      setError(e.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }

  // Build the per-species tip list from verified candidate entries.
  function buildTipsFromVerified(verified) {
    const bySpecies = new Map();
    for (const v of verified) {
      let entry = bySpecies.get(v.sciName);
      if (!entry) {
        entry = { sci: v.sciName, common: v.comName, locations: [] };
        bySpecies.set(v.sciName, entry);
      }
      entry.locations.push({
        locId: v.locId,
        locName: v.locName,
        obsDt: v.mostRecent,
        observerCount: v.observers.size,
      });
    }
    const arr = [];
    for (const entry of bySpecies.values()) {
      entry.locations.sort((a, b) => b.obsDt.localeCompare(a.obsDt));
      entry.mostRecent = entry.locations[0].obsDt;
      arr.push(entry);
    }
    arr.sort((a, b) => b.mostRecent.localeCompare(a.mostRecent));
    return arr;
  }

  // Helpers for date display
  function relDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} wk ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const hasApiKey = !!apiKey;
  const hasLocations = targetLocations.length > 0;
  const shownTips = (tips || []).slice(0, 40);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="max-w-2xl w-full relative flex flex-col rounded-2xl overflow-hidden"
        style={{ background: '#fff8e8', border: '3px solid #2a3445', boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative p-6 sm:p-7 pb-4 border-b rule">
          <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink z-10 transition-colors">
            <X size={18} />
          </button>
          <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Hints</div>
          <h2 className="font-display ink text-2xl sm:text-3xl mb-1" style={{ fontWeight: 700 }}>Birds you've missed</h2>
          <p className="ink-soft text-sm">
            Recently reported at your eBird hotspots — but not yet on your life list
          </p>
        </div>

        {/* body */}
        <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {/* No locations available */}
          {!hasLocations && (
            <div className="surface-1 rounded-2xl p-5 text-center">
              <h3 className="font-display ink text-lg mb-2" style={{ fontWeight: 600 }}>Re-upload your CSV</h3>
              <p className="text-sm ink-soft leading-relaxed mb-4">
                Tips need eBird Location IDs from your checklist data — a column that
                wasn't captured in earlier versions. Re-upload your <span className="font-mono text-xs">MyEBirdData.csv</span> from
                Settings to enable hints.
              </p>
              <p className="text-xs ink-faint">
                You won't lose any data — your count, sightings, and map stay the same.
              </p>
            </div>
          )}

          {/* No API key */}
          {hasLocations && !hasApiKey && (
            <div className="surface-1 rounded-2xl p-5 mb-3">
              <div className="font-mono text-[10px] ink-faint tracking-widest uppercase mb-2">Step 1</div>
              <h3 className="font-display ink text-lg mb-2" style={{ fontWeight: 600 }}>Connect your eBird API key</h3>
              <p className="text-sm ink-soft leading-relaxed mb-3">
                Tips use eBird's public API to see what's been spotted at your {targetLocations.length} regular hotspots.
                The key is free, takes a minute, and is stored only on this device.
              </p>
              <div className="text-xs ink-faint mb-3">
                Go to <a href="https://ebird.org/api/keygen" target="_blank" rel="noopener noreferrer" className="rust underline">ebird.org/api/keygen</a>,
                paste the key into Settings.
              </div>
              <button
                onClick={() => { onOpenSettings(); }}
                className="btn-ink rounded-full px-5 py-2 text-sm inline-flex items-center gap-2"
              >
                <Settings size={14} />
                Open Settings
              </button>
            </div>
          )}

          {/* Have key, nothing fetched yet */}
          {hasLocations && hasApiKey && tips === null && !loading && (
            <div className="surface-1 rounded-2xl p-5 mb-3 text-center">
              <h3 className="font-display ink text-lg mb-2" style={{ fontWeight: 600 }}>Ready to scan</h3>
              <p className="text-sm ink-soft leading-relaxed mb-4">
                We'll read the last 7 days of checklist history at your {targetLocations.length} most-birded
                hotspots and surface any native species reported by 2+ separate observers — filtering out
                vagrants, one-off sightings, and single-birder reports.
              </p>
              <p className="text-xs ink-faint mb-4">
                ~{Math.ceil((targetLocations.length * 7) / 3 * 0.15)}s on first run; instant after that.
              </p>
              <button
                onClick={() => fetchAll(false)}
                className="btn-ink rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Find missed birds
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="surface-1 rounded-2xl p-5 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw size={16} className="rust animate-spin" />
                <span className="font-display ink text-sm" style={{ fontWeight: 600 }}>
                  Reading hotspot histories…
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%',
                    background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
                  }}
                />
              </div>
              <div className="font-mono text-[10px] ink-faint tracking-wider mt-2">
                {progress.done} / {progress.total} day-records
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl p-4 mb-3 text-sm" style={{
              background: 'rgba(127, 29, 29, 0.30)',
              border: '1px solid rgba(248, 113, 113, 0.25)',
              color: '#fda4af',
            }}>
              {error}
            </div>
          )}

          {/* Empty result */}
          {tips !== null && shownTips.length === 0 && !loading && (
            <div className="text-center py-8 ink-faint text-sm">
              No corroborated missed birds in the last 7 days. Only species reported
              by ≥ 2 separate observers at the same hotspot count — vagrants and
              single-birder reports are filtered out.
            </div>
          )}

          {/* Tips list */}
          {shownTips.length > 0 && (
            <>
              {cacheTimestamp && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
                    {shownTips.length} {shownTips.length === 1 ? 'species' : 'species'} · as of {relDate(new Date(cacheTimestamp).toISOString())}
                  </span>
                  <button
                    onClick={() => fetchAll(true)}
                    disabled={loading}
                    className="btn-ghost rounded-full px-3 py-1 text-[11px] inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              )}
              <ul>
                {shownTips.map((t) => (
                  <li
                    key={t.sci}
                    className="species-row flex items-start gap-3 px-3 py-3 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-2 h-2 mt-2 rounded-full shrink-0" style={{ background: '#fb923c', boxShadow: '0 0 8px rgba(249,115,22,0.6)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <div className="text-[15px] ink leading-tight" style={{ fontWeight: 600 }}>{t.common}</div>
                        {t.locations.length > 1 && (
                          <span className="font-mono text-[10px] rust" style={{ fontWeight: 600 }}>
                            ×{t.locations.length}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] ink-faint mt-0.5 truncate" style={{ fontStyle: 'italic' }}>{t.sci}</div>
                      {t.locations.length === 1 ? (
                        <div className="text-xs ink-soft mt-1">
                          <span className="rust" style={{ fontWeight: 500 }}>{relDate(t.locations[0].obsDt)}</span>
                          <span className="ink-faint"> · </span>
                          {t.locations[0].locName}
                          <span className="ink-faint font-mono ml-1">
                            ({t.locations[0].observerCount} observers)
                          </span>
                        </div>
                      ) : (
                        <ul className="mt-1.5 space-y-1">
                          {t.locations.map((l) => (
                            <li key={l.locId} className="text-xs ink-soft flex items-baseline gap-2">
                              <span className="rust shrink-0" style={{ fontWeight: 500, minWidth: '4.5em' }}>
                                {relDate(l.obsDt)}
                              </span>
                              <span className="ink-faint truncate flex-1">{l.locName}</span>
                              <span className="ink-faint font-mono shrink-0">
                                {l.observerCount} obs
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* footer */}
        <div className="relative px-4 sm:px-6 py-3 border-t rule flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase">
            {targetLocations.length} hotspot{targetLocations.length === 1 ? '' : 's'} scanned
          </span>
          <button onClick={onClose} className="btn-ghost rounded-full px-4 py-1.5 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Install prompt drawer — manual instructions when the browser cannot trigger
// an install prompt for us (iOS Safari, or desktop without PWA install support).
// ============================================================================
function InstallPromptDrawer({ onClose }) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,52,69,0.45)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div
        className="surface-2 rounded-2xl max-w-md w-full p-7 relative"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 ink-soft hover:ink transition-colors">
          <X size={18} />
        </button>

        <div className="font-mono text-[10px] ink-faint tracking-[0.25em] uppercase mb-1">Install</div>
        <h2 className="font-display ink text-2xl mb-1" style={{ fontWeight: 700 }}>Add to Home Screen</h2>
        <p className="ink-soft text-sm mb-6">
          Get an app-like experience with quick access from your home screen — same data, just one tap.
        </p>

        {isIOS ? (
          <div className="space-y-4">
            <p className="text-xs ink-faint">
              {isSafari ? 'In Safari:' : "iOS requires Safari for this — open this page in Safari, then:"}
            </p>
            <ol className="space-y-3 text-sm ink-soft">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>1</span>
                <span>
                  Tap the <span className="inline-flex items-center px-2 py-0.5 rounded" style={{ background: 'rgba(95,168,211,0.15)', border: '1.5px solid #5fa8d3' }}>
                    <Share2 size={13} className="teal mr-1" />
                    <span className="teal text-xs" style={{ fontWeight: 600 }}>Share</span>
                  </span> button at the bottom of Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>2</span>
                <span>
                  Scroll down and tap <span className="inline-flex items-center px-2 py-0.5 rounded" style={{ background: 'rgba(249,115,22,0.10)' }}>
                    <Plus size={13} className="rust mr-1" />
                    <span className="rust text-xs" style={{ fontWeight: 600 }}>Add to Home Screen</span>
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>3</span>
                <span>Tap <span className="ink" style={{ fontWeight: 600 }}>Add</span> in the top right</span>
              </li>
            </ol>
          </div>
        ) : isAndroid ? (
          <div className="space-y-3 text-sm ink-soft">
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>1</span>
                <span>Tap the <span className="ink" style={{ fontWeight: 600 }}>⋮ menu</span> in your browser's top right</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>2</span>
                <span>Select <span className="ink" style={{ fontWeight: 600 }}>Install app</span> or <span className="ink" style={{ fontWeight: 600 }}>Add to Home Screen</span></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ink shrink-0 bg-yellow-100 border-2 border-yellow-600" style={{ fontWeight: 600 }}>3</span>
                <span>Confirm to add the icon</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-sm ink-soft">
            <p>
              Look for an install icon in your browser's address bar, or use the browser menu to find
              "Install Birder" or "Add to Home Screen".
            </p>
            <p className="text-xs ink-faint">For the best experience, open this site on your phone (iPhone or Android).</p>
          </div>
        )}

        <div className="border-t rule mt-6 pt-4 flex justify-end">
          <button onClick={onClose} className="btn-ghost rounded-full px-5 py-2 text-sm">Got it</button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Sightings map drawer — kernel-density heatmap of observation locations
// ============================================================================
const STATES = feature(statesTopo, statesTopo.objects.states);
const STATE_BORDERS = mesh(statesTopo, statesTopo.objects.states, (a, b) => a !== b);
const NATION_BORDER = mesh(statesTopo, statesTopo.objects.states, (a, b) => a === b);
// Merged US outline as a fillable MultiPolygon (for clipPath)
const NATION_OUTLINE = merge(statesTopo, statesTopo.objects.states.geometries);

// ---------- Regional zoom ----------
// FIPS code → 2-letter postal abbreviation. us-atlas uses FIPS codes as the
// `id` field on each state geometry.
const FIPS_TO_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA',
  '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
  '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
  '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI',
  '45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
  '54':'WV','55':'WI','56':'WY',
};
const ABBR_TO_FIPS = Object.fromEntries(Object.entries(FIPS_TO_ABBR).map(([f,a]) => [a,f]));

// 11-region partition of the country. Designed to honor common geographic
// understanding (PNW, Rockies, Plains, etc.) while keeping the regions
// reasonably balanced. Alaska and Hawaii are each their own region because
// grouping them with the Pacific states forces enormous bounding boxes that
// shrink the contiguous states to invisibility when zoomed. Great Plains is
// split into a Northern half (ND/SD/NE/KS) and a Southern half (TX/OK) for
// the same reason: with TX and OK in the same group, the region's bbox spans
// nearly the entire latitude range of the lower 48 and there's almost no
// zoom benefit.
const REGIONS = [
  { id: 'pnw', name: 'Pacific Northwest', states: ['WA','OR','ID'] },
  { id: 'cal', name: 'California',        states: ['CA'] },
  { id: 'ak',  name: 'Alaska',            states: ['AK'] },
  { id: 'hi',  name: 'Hawaii',            states: ['HI'] },
  { id: 'sw',  name: 'Southwest',         states: ['AZ','NM','UT','NV'] },
  { id: 'rm',  name: 'Rocky Mountains',   states: ['MT','WY','CO'] },
  { id: 'gp',  name: 'Great Plains',      states: ['ND','SD','NE','KS'] },
  { id: 'sp',  name: 'Southern Plains',   states: ['OK','TX'] },
  { id: 'mw',  name: 'Midwest',           states: ['MN','IA','MO','WI','IL','MI','IN','OH'] },
  { id: 'ne',  name: 'Northeast',         states: ['PA','NY','NJ','CT','RI','MA','VT','NH','ME','DE','MD','DC','WV'] },
  { id: 'se',  name: 'Southeast',         states: ['AR','LA','MS','AL','GA','FL','TN','KY','NC','SC','VA'] },
];
const STATE_TO_REGION = {};
for (const r of REGIONS) for (const s of r.states) STATE_TO_REGION[s] = r.id;
const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Pre-compute each region's merged polygon (used both as a clip outline when
// zoomed AND for point-in-polygon filtering of heat points).
const REGION_GEOMETRY = {};
for (const r of REGIONS) {
  const fipsSet = new Set(r.states.map(a => ABBR_TO_FIPS[a]).filter(Boolean));
  const geoms = statesTopo.objects.states.geometries.filter(g => fipsSet.has(g.id));
  REGION_GEOMETRY[r.id] = merge(statesTopo, geoms);
}

// Borders BETWEEN different regions — these get a thicker stroke on the full
// US view so the regions read as distinct clickable areas.
const REGION_BORDERS = mesh(statesTopo, statesTopo.objects.states, (a, b) => {
  return STATE_TO_REGION[FIPS_TO_ABBR[a.id]] !== STATE_TO_REGION[FIPS_TO_ABBR[b.id]];
});

// Assign each National Park to a region by testing its centroid against the
// region polygons. Parks whose centroid lands in no region (e.g. American
// Samoa, far offshore) are dropped — they'd never appear in a regional view.
// Computed once at module load. Result: { regionId: [parkFeature, …] }.
const PARKS_BY_REGION = (() => {
  const out = {};
  for (const r of REGIONS) out[r.id] = [];
  for (const park of NATIONAL_PARKS.features) {
    let c;
    try { c = geoCentroid(park); } catch { continue; }
    if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    for (const r of REGIONS) {
      const geo = REGION_GEOMETRY[r.id];
      if (geo && geoContains(geo, c)) { out[r.id].push(park); break; }
    }
  }
  return out;
})();

// Albers USA projection sized for a 700×440 viewBox
const MAP_W = 700;
const MAP_H = 440;
const PROJECTION = geoAlbersUsa().scale(900).translate([MAP_W / 2, MAP_H / 2]);
const PATH = geoPath(PROJECTION);
// Identity path (no projection) for rendering contour features whose coords
// are already in screen pixels.
const PIXEL_PATH = geoPath();

// Per-region projection factories.
//
// Plain geoAlbers() carries the defaults tuned for the conterminous US:
// standard parallels at 29.5°N and 45.5°N, central meridian rotated to 96°W.
// When you then fitExtent() it onto Alaska's ~52–71°N range or Hawaii's
// ~19–22°N range, the conic fan is the wrong shape for those latitudes and
// you get the skew you'd see if you tried to flatten a globe from the
// perspective of someone standing over Kansas.
//
// The fix is the same one d3.geoAlbersUsa uses internally for its AK/HI
// composite insets: give each region its own conic with parallels that
// bracket the region's actual latitude range and a rotation that puts the
// region's central longitude on the projection's central meridian. These
// magic numbers match d3-composite-projections' Albers presets.
//
// For every other region the lower-48 defaults are close enough; only AK and
// HI sit far enough from those parallels for the distortion to be visible.
const REGION_PROJ_FN = {
  ak: () => geoAlbers().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]),
  hi: () => geoAlbers().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]),
};

// Warm sequential color scale: transparent → bright peach red.
// `t` in [0, 1]. The lowest stop is fully transparent so the outer fringe of
// each hotspot fades naturally into the map background instead of stopping at
// a hard 60%-alpha edge.
// Number of DISTINCT species in an area at which the colormap saturates to the
// hot (red) end. Since the density now measures true distinct-species counts
// (not summed/compressed location weights), this value is directly
// interpretable: at 50, an area with ~50 distinct species nearby reads as
// saturated red, and the blue→green→yellow→orange ramp spreads across 0–50.
// Tune up if hotspots feel too saturated; down if the hot end is too hard to
// reach. (Was 12 under the old sqrt-compressed KDE scale.)
const HEATMAP_SATURATION_N = 50;

// ----------------------------------------------------------------------------
// Distinct-species density grid.
//
// PROBLEM with the old approach: it ran a kernel density estimate weighting
// each location by its species COUNT, then let d3 SUM overlapping kernels. KDE
// has no notion of species identity, so the same species observed at several
// nearby locations was counted once per location. Two adjacent spots with
// {Cardinal, Blue Jay, Wren} and {Cardinal, Wren, Chickadee} summed to 6 even
// though only 4 distinct species are present — inflating dense metros ~2x.
//
// FIX: compute density per SPECIES, taking the MAX of that species' kernel
// across the locations where it occurs (a union, not a sum — a species present
// at 5 nearby spots is still just "present"), then SUM those per-species fields
// across species. The result at any pixel ≈ the number of DISTINCT species
// present in the surrounding area. Set-union can't be expressed as a weighted
// KDE, so we build the density grid by hand and hand it to d3.contours().
//
// `pts` is the projected, region-filtered point list: [x, y, count, [sciIdx…]].
// Returns { grid: Float64Array(gw*gh), gw, gh } in row-major order.
function distinctSpeciesGrid(pts, viewBoxW, viewBoxH, bandwidth, cellSize) {
  const gw = Math.ceil(viewBoxW / cellSize);
  const gh = Math.ceil(viewBoxH / cellSize);
  const grid = new Float64Array(gw * gh);
  // Gaussian kernel falls below ~1e-3 past 3.7σ; clamp the per-location stamp
  // radius there so each location only touches nearby cells (keeps it fast).
  const sigma = bandwidth / cellSize;            // σ in grid cells
  const inv2s2 = 1 / (2 * sigma * sigma);
  const reach = Math.ceil(sigma * 3.7);

  // Invert: build species → list of locations (grid coords). A point's [3] is
  // its species-index array; if absent (legacy data) fall back to a single
  // synthetic "species" per location so the function still produces a sane grid.
  const speciesLocs = new Map(); // sciIdx → [[gx,gy], …]
  let synthetic = 0;
  for (const p of pts) {
    const gx = p[0] / cellSize, gy = p[1] / cellSize;
    const idxs = (p.length >= 4 && Array.isArray(p[3])) ? p[3] : null;
    if (idxs && idxs.length) {
      for (const id of idxs) {
        let arr = speciesLocs.get(id);
        if (!arr) { arr = []; speciesLocs.set(id, arr); }
        arr.push([gx, gy]);
      }
    } else {
      // legacy fallback: treat the location's count as that many anonymous
      // species all sitting at this one spot (no cross-location dedup possible)
      const n = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      for (let k = 0; k < n; k++) speciesLocs.set('syn' + (synthetic++), [[gx, gy]]);
    }
  }

  // For each species, stamp the MAX of its location kernels into a scratch
  // field, then add that field into the accumulator grid.
  const scratch = new Float64Array(gw * gh);
  for (const locs of speciesLocs.values()) {
    // collect the bounding set of touched cells for this species, max-combining
    // its locations, then add once to grid.
    const touched = new Map(); // cellIndex → maxKernelValue
    for (const [cx, cy] of locs) {
      const x0 = Math.max(0, Math.floor(cx - reach));
      const x1 = Math.min(gw - 1, Math.ceil(cx + reach));
      const y0 = Math.max(0, Math.floor(cy - reach));
      const y1 = Math.min(gh - 1, Math.ceil(cy + reach));
      for (let yy = y0; yy <= y1; yy++) {
        const dy = yy - cy;
        for (let xx = x0; xx <= x1; xx++) {
          const dx = xx - cx;
          const v = Math.exp(-(dx * dx + dy * dy) * inv2s2);
          const ci = yy * gw + xx;
          const prev = touched.get(ci);
          if (prev === undefined || v > prev) touched.set(ci, v);
        }
      }
    }
    for (const [ci, v] of touched) grid[ci] += v;
  }
  return { grid, gw, gh };
}

// Peak density a single isolated species (one location) produces under the
// same kernel — the stable scale anchor. With the Gaussian kernel peaking at
// 1.0, this is exactly 1.0, but we compute it the same way for safety.
function singleSpeciesPeak() { return 1.0; }

// Floor anchor: the smallest visible blob always renders at this point on
// the colormap. 0.20 lands solidly inside the visible blue band of
// heatColor (which starts fading in around t=0.10). So a single-visit
// site is always a clear blue dot — never a barely-there ghost.
const HEATMAP_MIN_T = 0.20;

// Compress a density value to a 0..1 colormap position using a linear
// interpolation between an explicit floor and an explicit cap:
//
//   value ≤ floor → HEATMAP_MIN_T  (clear blue — minimum visibility)
//   value ≥ cap   → 1.0            (max color — saturated)
//   between       → linear interp from HEATMAP_MIN_T to 1.0
//
// The floor is tied to singlePointRef (the density a single weight-1 point
// produces), which is a stable absolute reference. This is what makes the
// rendering scale-stable as the user's data grows: a single isolated point
// always lands at the same place on the spectrum regardless of how dense
// the user's hotspots become.
//
// Why a CONCAVE exponent (r^0.9) on the normalized interval: real eBird
// data is spatially spread out, so most colored area comes from isolated
// strong locations whose kernel density peaks at only ~4-5x singlePointRef,
// not from tightly-stacked clusters. A convex curve (squared/cubic) buried
// all of that range in blue, leaving the full rainbow unused. A mildly
// concave curve LIFTS those mid-density locations up into green/yellow so
// the whole spectrum shows, while the cap (12x) keeps red reserved for the
// rare tightly-overlapping cluster cores (e.g. dense metro hotspots). The
// tradeoff: a true single point reads faint green rather than pure blue,
// which is acceptable since isolated singles are rare in practice.
// Both endpoints stay anchored: floor -> blue, cap -> red, preserving
// scale stability as data grows.
//
// Tuning the exponent: <1 (concave) spreads low densities UP into warm
// colors (more rainbow); 1.0 is linear; >1 (convex, e.g. cubic) pushes the
// middle DOWN toward blue so only the hottest peaks reach red. Was cubic
// (r*r*r) when the cap was 6x and data was assumed to stack into dense
// clusters; switched to 0.9 + cap 12 after profiling real spread-out data.
function densityT(value, singlePointRef) {
  if (singlePointRef <= 0) return 0;
  const floor = singlePointRef * 0.3;
  const cap   = singlePointRef * HEATMAP_SATURATION_N;
  if (value <= floor) return HEATMAP_MIN_T;
  if (value >= cap)   return 1.0;
  const r = (value - floor) / (cap - floor);  // 0..1 inside the band
  return HEATMAP_MIN_T + (1 - HEATMAP_MIN_T) * Math.pow(r, 0.9);
}

function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  // Classic thermal-imaging ramp: blue → green → yellow → orange → dark red.
  // Reads like a temperature gradient, so the visual story tells itself:
  // cool-blue haze at the fringe of activity, warm-red at hotspot cores.
  //
  // Tuned for the pale mint basemap (#c8e6c8):
  // - The cool end uses a lighter sky-blue at low opacity so a single
  //   low-density sighting reads as a soft wash that blends into the
  //   open landscape rather than a hard dark dot competing for attention.
  // - The green band uses a darker, more saturated green than the mint
  //   so it stays distinct rather than blending into the basemap.
  // - Warm bands (yellow, orange, dark red) keep high opacity so cluster
  //   cores still bloom strongly through the spectrum.
  // - The very edge stays transparent so contours feather softly into
  //   the basemap rather than terminating in a hard line.
  const stops = [
    { at: 0.00, c: [255, 245, 225, 0.00] }, // transparent cream fringe
    { at: 0.10, c: [105, 150, 200, 0.28] }, // soft sky-blue haze (faded)
    { at: 0.25, c: [ 55, 130, 200, 0.55] }, // mid blue
    { at: 0.42, c: [ 50, 160, 100, 0.78] }, // saturated green
    { at: 0.60, c: [225, 195,  55, 0.88] }, // yellow
    { at: 0.80, c: [232, 130,  45, 0.92] }, // orange
    { at: 1.00, c: [232,  55, 110, 0.95] }, // saturated bright pink-red core
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i].at) {
      const lo = stops[i - 1];
      const hi = stops[i];
      const u = (t - lo.at) / (hi.at - lo.at);
      const c = lo.c.map((v, k) => v + (hi.c[k] - v) * u);
      return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
    }
  }
  const c = stops[stops.length - 1].c;
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
}

// ============================================================================
// Badges page — achievement tiers across species count, regions explored,
// threatened species, and specialist traits. All progress is derived from the
// seen-species set + region counts; locked tiers render greyed out.
// ============================================================================
function BadgeIcon({ name, size = 22, color }) {
  const props = { size, color, strokeWidth: 2.25 };
  if (name === 'feather') return <Feather {...props} />;
  if (name === 'globe') return <Globe {...props} />;
  if (name === 'shield') return <Award {...props} />;
  if (name === 'sparkles') return <Sparkles {...props} />;
  // ---- per-badge Specialist icons ----
  if (name === 'waves') return <Waves {...props} />;
  if (name === 'mask') return <VenetianMask {...props} />;
  // crescent moon (lucide's clean crescent path) + simple round dot stars,
  // one placed at the bottom-left so they aren't clustered in the corner.
  if (name === 'moonstars') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
        <circle cx="20.5" cy="4.2" r="1.05" fill={color} stroke="none" />
        <circle cx="16.3" cy="2.4" r="0.7" fill={color} stroke="none" />
        <circle cx="4.3" cy="17.2" r="1.0" fill={color} stroke="none" />
      </svg>
    );
  }
  // single hiking-boot tread imprint → lucide Footprints (clean library icon)
  if (name === 'boot') return <Footprints {...props} />;
  return <Trophy {...props} />;
}

function BadgesView({ seenSci, userCount, atRiskSeen, regionNativeCount, speciesStats, usNonNativeCount, onBack }) {
  const [selected, setSelected] = useState(null); // { group, tier, unlocked, earnedDate }

  // Assemble the stats the badge selectors read.
  const stats = useMemo(() => {
    const regionsWithSightings = Object.keys(regionNativeCount || {}).filter(
      (r) => (regionNativeCount[r] || 0) > 0
    );
    const regionSet = new Set(regionsWithSightings);
    const lower48Done = LOWER_48_REGION_IDS.every((r) => regionSet.has(r));
    // single-region milestones + coastal achievement
    const hawaiiDone = regionSet.has('hi');
    const alaskaDone = regionSet.has('ak');
    const hasEastCoast = regionSet.has('se') || regionSet.has('ne');
    const hasWestCoast = regionSet.has('cal') || regionSet.has('pnw');
    const coastToCoastDone = hasEastCoast && hasWestCoast;
    // trait booleans: has the user seen ANY species of each trait?
    let pelagic = false, nocturnal = false, specialized = false;
    for (const sci of seenSci) {
      if (!pelagic && isPelagicSci(sci)) pelagic = true;
      if (!nocturnal && isNocturnalSci(sci)) nocturnal = true;
      if (!specialized && isSpecializedSci(sci)) specialized = true;
      if (pelagic && nocturnal && specialized) break;
    }
    return {
      speciesCount: userCount || 0,
      regionCount: regionSet.size,
      lower48Done,
      hawaiiDone,
      alaskaDone,
      coastToCoastDone,
      threatenedCount: atRiskSeen || 0,
      usNonNativeCount: usNonNativeCount || 0,
      traits: {
        pelagic, nocturnal, specialized,
        fowlplay: (usNonNativeCount || 0) >= FOWL_PLAY_THRESHOLD,
      },
    };
  }, [seenSci, userCount, atRiskSeen, regionNativeCount, usNonNativeCount]);

  // Pre-sort the user's first-seen dates so we can derive WHEN a count-based
  // threshold was crossed: the Nth earliest first-seen date is the day the Nth
  // species was added, i.e. the day that tier unlocked. Built once.
  const earnedDates = useMemo(() => {
    const ss = speciesStats || {};
    // all seen species' first-seen timestamps, ascending
    const allDates = [];
    const threatenedDates = [];
    const traitFirst = { pelagic: null, nocturnal: null, specialized: null };
    for (const sci of Object.keys(ss)) {
      const iso = ss[sci] && ss[sci].first;
      if (!iso) continue;
      const ts = new Date(iso).getTime();
      if (!Number.isFinite(ts)) continue;
      allDates.push(ts);
      if (AT_RISK_SCI.has(sci)) threatenedDates.push(ts);
      if (isPelagicSci(sci) && (traitFirst.pelagic == null || ts < traitFirst.pelagic)) traitFirst.pelagic = ts;
      if (isNocturnalSci(sci) && (traitFirst.nocturnal == null || ts < traitFirst.nocturnal)) traitFirst.nocturnal = ts;
      if (isSpecializedSci(sci) && (traitFirst.specialized == null || ts < traitFirst.specialized)) traitFirst.specialized = ts;
    }
    allDates.sort((a, b) => a - b);
    threatenedDates.sort((a, b) => a - b);
    return { allDates, threatenedDates, traitFirst };
  }, [speciesStats]);

  // Given a group+tier that is unlocked, return the earned timestamp (ms) or
  // null when it can't be precisely derived (e.g. region tiers, for now).
  const earnedTimestamp = (group, tier, unlocked) => {
    if (!unlocked) return null;
    if (group.id === 'species') {
      const arr = earnedDates.allDates;
      return arr.length >= tier.threshold ? arr[tier.threshold - 1] : null;
    }
    if (group.id === 'threatened') {
      const arr = earnedDates.threatenedDates;
      return arr.length >= tier.threshold ? arr[tier.threshold - 1] : null;
    }
    if (group.custom === 'traits') {
      return earnedDates.traitFirst[tier.key] || null;
    }
    return null; // regions: not precisely datable yet
  };

  // total unlocked across everything, for the header tally
  const { totalUnlocked, totalBadges } = useMemo(() => {
    let unlocked = 0, total = 0;
    for (const g of BADGE_GROUPS) {
      for (const t of g.tiers) {
        total++;
        if (isTierUnlocked(g, t, stats)) unlocked++;
      }
    }
    return { totalUnlocked: unlocked, totalBadges: total };
  }, [stats]);

  return (
    <div
      className="relative max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col"
      style={{ minHeight: '100vh' }}
    >
      <div className="anim-1 flex flex-col gap-3 pb-6">
      {/* header — chunky gold banner */}
      <header
        className="anim-1 relative flex items-center justify-between mb-1 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #ffd97a 0%, #ffe9a8 100%)',
          border: '3px solid #2a3445',
          boxShadow: '0 4px 0 0 #2a3445',
          borderRadius: 22,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back to home"
          className="inline-flex items-center gap-1.5"
          style={{
            background: '#fff', border: '2.5px solid #2a3445', borderRadius: 999,
            padding: '6px 14px 6px 10px', color: '#2a3445',
            boxShadow: '0 2px 0 0 #2a3445', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: 14,
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.5} /> Home
        </button>
        <div className="font-display flex items-center gap-2" style={{ fontWeight: 700, fontSize: 20, color: '#2a3445', letterSpacing: '0.02em' }}>
          Badges <Trophy size={20} strokeWidth={2.25} />
        </div>
      </header>

      {/* tally — a small cream pill so it stays legible against the blue
          gradient background (plain tan text washed out). */}
      <div className="text-center anim-2" style={{ marginTop: 4, marginBottom: 4 }}>
        <span
          className="font-mono inline-flex items-center"
          style={{
            fontSize: 13, fontWeight: 600, color: '#2a3445',
            background: '#fff8e8', border: '2px solid #2a3445', borderRadius: 999,
            padding: '3px 12px', boxShadow: '0 2px 0 0 #2a3445',
          }}
        >
          {totalUnlocked}<span style={{ color: '#8a7a5e' }}>&nbsp;/ {totalBadges} unlocked</span>
        </span>
      </div>

      {/* groups */}
      {BADGE_GROUPS.map((g) => {
        const current = g.custom === 'traits' ? null : g.value(stats);
        // next locked tier for the progress note (first tier not yet unlocked)
        const nextTier = g.custom === 'traits' ? null
          : g.tiers.find((t) => !isTierUnlocked(g, t, stats));
        return (
          <section
            key={g.id}
            className="anim-3"
            style={{ background: '#fffdf6', border: '2.5px solid #2a3445', borderRadius: 18, boxShadow: '0 3px 0 0 #2a3445', padding: '14px 14px 16px', overflow: 'hidden' }}
          >
            {/* group header */}
            <div className="flex items-center gap-2.5 mb-1">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: g.accent, border: '2px solid #2a3445', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff8e8', flexShrink: 0 }}>
                <BadgeIcon name={g.icon} size={19} color="#fff8e8" />
              </div>
              <div className="min-w-0">
                <div className="font-display" style={{ fontWeight: 700, fontSize: 16, color: '#2a3445', lineHeight: 1.1 }}>{g.title}</div>
                <div style={{ fontSize: 11, color: '#8a7a5e' }}>{g.blurb}</div>
              </div>
            </div>

            {/* "toward next badge" progress note removed — each tile already
                shows its own X / N count, so the header note was redundant.
                The all-unlocked celebration is kept. */}
            {g.custom !== 'traits' && !nextTier ? (
              <div style={{ fontSize: 11, color: g.accent, margin: '4px 0 10px', fontWeight: 600 }}>
                All {g.title} badges unlocked! 🎉
              </div>
            ) : (
              <div style={{ height: 8 }} />
            )}

            {/* tier grid */}
            <div className="grid grid-cols-3 gap-2">
              {g.tiers.map((t, i) => {
                const unlocked = isTierUnlocked(g, t, stats);
                // per-badge icon/color override (Specialist badges), else group
                const tierAccent = t.accent || g.accent;
                const tierIcon = t.icon || g.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected({ group: g, tier: t, unlocked, earned: earnedTimestamp(g, t, unlocked) })}
                    style={{
                      position: 'relative',
                      background: unlocked ? '#fff8e8' : '#f0ece2',
                      border: `2px solid ${unlocked ? '#2a3445' : '#cabfa8'}`,
                      borderRadius: 12,
                      padding: '10px 6px 8px',
                      textAlign: 'center',
                      boxShadow: unlocked ? '0 2px 0 0 #2a3445' : 'none',
                      opacity: unlocked ? 1 : 0.65,
                      cursor: 'pointer',
                    }}
                  >
                    {/* medallion */}
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: '50%', margin: '0 auto 6px',
                        background: unlocked ? tierAccent : '#d8cfbb',
                        border: `2px solid ${unlocked ? '#2a3445' : '#b6a98c'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: unlocked ? '#fff8e8' : '#9a8a72',
                      }}
                    >
                      {unlocked ? <BadgeIcon name={tierIcon} size={18} color="#fff8e8" /> : <Lock size={15} strokeWidth={2.5} />}
                    </div>
                    <div className="font-display" style={{ fontSize: 11.5, fontWeight: 700, color: unlocked ? '#2a3445' : '#9a8a72', lineHeight: 1.1 }}>{t.name}</div>
                    <div style={{ fontSize: 9, color: unlocked ? '#8a7a5e' : '#a89a7e', marginTop: 2, lineHeight: 1.15 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      </div>

      {/* badge detail popup */}
      {selected && (
        <BadgeDetailPopup
          group={selected.group}
          tier={selected.tier}
          unlocked={selected.unlocked}
          earned={selected.earned}
          stats={stats}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Badge detail popup — tap any badge tile to see what it is, whether it's been
// earned, when, and how. Earned dates are precise for Life List, Threatened,
// and Specialist badges (derived from the user's first-seen dates); region
// tiers show as earned without a precise date for now.
// ----------------------------------------------------------------------------
function BadgeDetailPopup({ group, tier, unlocked, earned, stats, onClose }) {
  // per-badge icon/color override (Specialist badges), else group defaults
  const accent = tier.accent || group.accent;
  const icon = tier.icon || group.icon;
  // current progress value + target, for the "how earned" copy
  const isTrait = group.custom === 'traits';
  const isLower48 = tier.custom === 'lower48';
  const current = isTrait ? null : group.value(stats);
  const target = isTrait ? 1 : tier.threshold;

  const earnedDateStr = earned
    ? new Date(earned).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  // "How to earn / how earned" explanation per group.
  let howText;
  if (isTrait && tier.key === 'fowlplay') {
    const n = stats.usNonNativeCount || 0;
    howText = unlocked
      ? `Unlocked by recording ${FOWL_PLAY_THRESHOLD} non-native species (vagrants, escapees, and exotics) on checklists submitted within the US.`
      : `Record ${FOWL_PLAY_THRESHOLD} non-native species on US checklists — vagrants, escapees, and exotics, not birds seen abroad. You're at ${n} of ${FOWL_PLAY_THRESHOLD}.`;
  } else if (isTrait) {
    const traitName = { pelagic: 'pelagic (open-ocean)', nocturnal: 'nocturnal', specialized: 'specialized / range-restricted' }[tier.key] || tier.key;
    howText = unlocked
      ? `Unlocked by observing your first ${traitName} species.`
      : `Observe any ${traitName} species to unlock this badge.`;
  } else if (isLower48) {
    howText = unlocked
      ? 'Unlocked by recording at least one species in all nine lower-48 regions.'
      : `Record a species in all nine lower-48 regions. You're at ${current} of 9.`;
  } else if (tier.custom === 'hawaii') {
    howText = unlocked
      ? 'Unlocked by recording a species in the Hawaii region.'
      : 'Record a species in the Hawaii region to unlock this badge.';
  } else if (tier.custom === 'alaska') {
    howText = unlocked
      ? 'Unlocked by recording a species in the Alaska region.'
      : 'Record a species in the Alaska region to unlock this badge.';
  } else if (tier.custom === 'coast') {
    howText = unlocked
      ? 'Unlocked by recording species in both an East-coast region (Southeast or Northeast) and a West-coast region (California or Pacific Northwest).'
      : 'Record a species in an East-coast region (Southeast or Northeast) and a West-coast region (California or Pacific Northwest) to unlock this badge.';
  } else if (group.id === 'species') {
    howText = unlocked
      ? `Unlocked by adding ${tier.threshold} distinct native species to your life list.`
      : `Add ${tier.threshold} distinct native species to your life list. You're at ${current} of ${tier.threshold}.`;
  } else if (group.id === 'regions') {
    howText = unlocked
      ? `Unlocked by recording a species in ${tier.threshold} different regions.`
      : `Record a species in ${tier.threshold} different regions. You're at ${current} of ${tier.threshold}.`;
  } else if (group.id === 'threatened') {
    howText = unlocked
      ? `Unlocked by observing ${tier.threshold} IUCN-threatened ${tier.threshold === 1 ? 'species' : 'species'}.`
      : `Observe ${tier.threshold} IUCN-threatened species. You're at ${current} of ${tier.threshold}.`;
  } else {
    howText = tier.desc;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(42,52,69,0.5)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: 320, background: '#fff8e8',
          border: '3px solid #2a3445', borderRadius: 22,
          boxShadow: '0 8px 0 0 #2a3445, 0 30px 80px rgba(0,0,0,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header — group accent gradient */}
        <div style={{ background: accent, padding: '18px 16px 16px', position: 'relative', textAlign: 'center' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', background: '#fff8e8', border: '2.5px solid #2a3445', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3445' }}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
          {/* medallion */}
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px',
              background: unlocked ? '#fff8e8' : 'rgba(255,248,232,0.55)',
              border: '3px solid #2a3445',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: unlocked ? accent : '#9a8a72',
              boxShadow: '0 3px 0 0 #2a3445',
            }}
          >
            {unlocked ? <BadgeIcon name={icon} size={30} color={accent} /> : <Lock size={26} strokeWidth={2.5} />}
          </div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff8e8', lineHeight: 1.1, textShadow: '0 1px 0 rgba(42,52,69,0.35)' }}>{tier.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,248,232,0.92)', marginTop: 2, fontWeight: 600 }}>{group.title} · {tier.desc}</div>
        </div>

        {/* body */}
        <div style={{ padding: '14px 16px 18px' }}>
          {/* status pill */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: unlocked ? '#5cba87' : '#e8dcc0',
                color: unlocked ? '#10301f' : '#5a4a3e',
                border: '2px solid #2a3445', borderRadius: 999, padding: '4px 12px',
                fontSize: 12, fontWeight: 600,
              }}
            >
              {unlocked ? <Check size={14} strokeWidth={3} /> : <Lock size={13} strokeWidth={2.5} />}
              {unlocked ? 'Earned' : 'Locked'}
            </span>
          </div>

          {/* earned date — only shown when we can derive a real date. Explorer
              (region) badges don't compute one, so the row is simply omitted
              rather than showing an "unavailable" placeholder. */}
          {unlocked && earnedDateStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fffdf6', border: '2px solid #2a3445', borderRadius: 10, marginBottom: 10 }}>
              <Calendar size={15} style={{ color: accent, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#3a3228' }}>
                Earned on <span style={{ fontWeight: 700 }}>{earnedDateStr}</span>
              </div>
            </div>
          )}

          {/* how earned */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: '#fffdf6', border: '2px solid #2a3445', borderRadius: 10 }}>
            <Lightbulb size={15} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, lineHeight: 1.5, color: '#3a3228' }}>{howText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


function SightingsMapView({
  pointsAll,
  pointsFirst,
  userCount,
  familiesSeen = 0,
  code3Seen = 0,
  atRiskSeen = 0,
  locationCount = 0,
  regionNativeCount = {},
  locations = [],
  onBack,
}) {
  const svgContainerRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  // Filter mode. 'all' = aggregate species count per location (the original
  // heatmap; biased toward most-birded spots). 'first' = each species's
  // first-found location, weighted by how many species you discovered there.
  // The first-sightings view flattens the heat because repeat visits to the
  // same hotspot stop contributing once you've seen everything there.
  const [mode, setMode] = useState('all');
  // Active region (null = full USA). When set, the projection refits to the
  // region's geometry and the heatmap is recomputed using only points inside
  // that region — so a Charlotte home patch can't pollute the Pacific NW view.
  const [region, setRegion] = useState(null);
  const points = (mode === 'first' ? pointsFirst : pointsAll) || [];
  const firstAvailable = Array.isArray(pointsFirst) && pointsFirst.length > 0;

  // Build the active projection AND its viewBox dimensions.
  //
  // Two strategies for regional zoom:
  //
  // 1. Lower 48 regions: target a fixed 1.3 miles-per-pixel resolution at the
  //    region's centroid. Each region's viewBox is sized to contain the
  //    geometry at that fixed scale, so a heat blob in Charlotte and a heat
  //    blob in Seattle represent the same real-world radius (≈ 6.5 mi for
  //    the regional bandwidth of 5). This makes cross-region comparison
  //    meaningful and prevents tiny regions from over-zooming while large
  //    ones starve for detail.
  //
  // 2. Alaska and Hawaii: keep the existing fit-to-viewBox behavior with
  //    their region-specific conic params (REGION_PROJ_FN). AK and HI are
  //    each one state with very specific geometry that needs custom handling,
  //    and a fixed 1.3 mi/px target would either make AK enormous (it's the
  //    size of two and a half Texases) or HI tiny.
  const { activeProj, activePath, activeOutline, activeName, viewBoxW, viewBoxH } = useMemo(() => {
    if (!region) {
      return {
        activeProj: PROJECTION,
        activePath: PATH,
        activeOutline: NATION_OUTLINE,
        activeName: 'United States',
        viewBoxW: MAP_W,
        viewBoxH: MAP_H,
      };
    }
    const geo = REGION_GEOMETRY[region];
    const meta = REGION_BY_ID[region];
    if (!geo || !meta) {
      return {
        activeProj: PROJECTION, activePath: PATH,
        activeOutline: NATION_OUTLINE, activeName: 'United States',
        viewBoxW: MAP_W, viewBoxH: MAP_H,
      };
    }
    const PAD = 8;

    // Strategy 2: AK and HI use their custom conic factories with fit-to-viewBox.
    if (REGION_PROJ_FN[region]) {
      const projFactory = REGION_PROJ_FN[region];
      const trial = projFactory();
      const trialBounds = geoPath(trial).bounds(geo);
      const trialW = trialBounds[1][0] - trialBounds[0][0];
      const trialH = trialBounds[1][1] - trialBounds[0][1];
      const aspect = trialW / trialH;
      const LONG_DIM = 700, MIN_SHORT_DIM = 280;
      let vbW, vbH;
      if (aspect >= 1) {
        vbW = LONG_DIM; vbH = Math.max(MIN_SHORT_DIM, Math.round(LONG_DIM / aspect));
      } else {
        vbH = LONG_DIM; vbW = Math.max(MIN_SHORT_DIM, Math.round(LONG_DIM * aspect));
      }
      const p = projFactory().fitExtent(
        [[PAD, PAD], [vbW - PAD, vbH - PAD]],
        geo,
      );
      return {
        activeProj: p, activePath: geoPath(p),
        activeOutline: geo, activeName: meta.name,
        viewBoxW: vbW, viewBoxH: vbH,
      };
    }

    // Strategy 1: lower-48 regions get a fixed 1.3 mi/px projection inside a
    // fixed-size viewBox.
    //
    // The fixed viewBox (FIXED_VB × FIXED_VB) is sized to comfortably hold the
    // largest region (Southeast, which needs ~839×819 at 1.3 mi/px). Smaller
    // regions render centered inside that same canvas, with the rest of the
    // SVG transparent so the card's dark background shows through — no white
    // bands, no visible region boundary, just smaller-looking states sitting
    // in the same dark map area.
    //
    // The point of this is proportional rendering: because every region uses
    // the same viewBox size, the SVG always shrinks to fit the card at the
    // same scale factor, so 1 viewBox pixel = the same on-screen pixels in
    // every region. Combined with the fixed 1.3 mi/px viewBox scale, that
    // means 1 real-world mile = the same number of on-screen pixels in every
    // region. Florida looks bigger than Kansas because it IS bigger; the
    // mismatch where small regions like Great Plains visually outgrew large
    // ones like Southeast goes away.
    const TARGET_MPP = 1.3;
    const MI_PER_DEG_LAT = 69.0;
    const FIXED_VB = 900;
    const k = (MI_PER_DEG_LAT / TARGET_MPP) * (180 / Math.PI);
    const centroid = geoCentroid(geo);

    // Center the projection on the region's centroid so distortion is
    // minimized there (the spot we're measuring mi/px against).
    let p = geoAlbers()
      .scale(k)
      .rotate([-centroid[0], 0])  // central meridian at centroid longitude
      .center([0, centroid[1]])    // visual center at centroid latitude
      .translate([0, 0]);

    // Project the geometry, then translate so the geometry's bbox CENTER
    // lands at the viewBox center. The geometry ends up centered in the
    // FIXED_VB square; smaller regions are surrounded by transparent
    // space that reveals the card background.
    const bnd = geoPath(p).bounds(geo);
    const geoCenterX = (bnd[0][0] + bnd[1][0]) / 2;
    const geoCenterY = (bnd[0][1] + bnd[1][1]) / 2;
    p = p.translate([FIXED_VB / 2 - geoCenterX, FIXED_VB / 2 - geoCenterY]);

    return {
      activeProj: p,
      activePath: geoPath(p),
      activeOutline: geo,
      activeName: meta.name,
      viewBoxW: FIXED_VB,
      viewBoxH: FIXED_VB,
    };
  }, [region]);

  // Project points to pixel space. Each point is [lng, lat, count, [sciIdx…]].
  // When zoomed to a region, points are first filtered to those inside the
  // region's geometry so the density reflects only that region's data.
  const { contours, projectedCount, maxValue, singlePointRef, totalSpeciesAcrossLocations, totalLocations } = useMemo(() => {
    const projected = [];
    let totalW = 0;
    const regionGeo = region ? REGION_GEOMETRY[region] : null;
    for (const p of points) {
      const lng = p[0], lat = p[1];
      const w = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      // Region filter: skip points outside the active region's geometry.
      if (regionGeo && !geoContains(regionGeo, [lng, lat])) continue;
      const xy = activeProj([lng, lat]);
      if (xy && !isNaN(xy[0]) && !isNaN(xy[1])) {
        // carry the species-index list (p[3]) through so the density can
        // de-duplicate species shared across nearby locations.
        projected.push([xy[0], xy[1], w, (p.length >= 4 && Array.isArray(p[3])) ? p[3] : null]);
        totalW += w;
      }
    }
    if (projected.length === 0) {
      return { contours: [], projectedCount: 0, maxValue: 0, singlePointRef: 0, totalSpeciesAcrossLocations: 0, totalLocations: 0 };
    }

    // Bandwidth per zoom level: tighter 3.5 for the national US map, 5 for
    // zoomed regional views. `region` is null nationally, truthy when zoomed.
    const HEATMAP_BANDWIDTH = region ? 5 : 3.5;
    const CELL = 2;

    // singlePointRef: the peak density one isolated species (at one location)
    // produces. With the Gaussian kernel this is exactly 1.0 and — crucially —
    // it does NOT move as the user's data grows, so the colormap scale is
    // stable. Densities are now interpretable as "distinct species present":
    //   1× ref  = one distinct species
    //   12× ref = SATURATION_N distinct species → fully saturated red
    const singlePointRef = singleSpeciesPeak();

    // Build the distinct-species density grid (max-within-species, sum-across-
    // species) and contour it at fixed thresholds tied to singlePointRef, so
    // every level always means the same number of distinct species. Fixed
    // thresholds (vs d3's data-adaptive auto-thresholds) keep isolated points
    // visible even when a dense cluster exists elsewhere.
    const { grid, gw, gh } = distinctSpeciesGrid(projected, viewBoxW, viewBoxH, HEATMAP_BANDWIDTH, CELL);

    const tHi = singlePointRef * HEATMAP_SATURATION_N;
    const tLo = singlePointRef * 0.3;
    const thresholds = Array.from({ length: 40 }, (_, i) =>
      tLo + (tHi - tLo) * (i / 39)
    );

    let cs = d3contours().size([gw, gh]).thresholds(thresholds)(grid);
    // d3.contours returns polygon coords in GRID space; scale back to viewBox
    // space (×CELL) so they render under the identity-projection PIXEL_PATH.
    cs = cs.map((c) => ({
      ...c,
      coordinates: c.coordinates.map((poly) =>
        poly.map((ring) => ring.map(([x, y]) => [x * CELL, y * CELL]))
      ),
    }));
    let maxV = 0;
    for (const v of grid) if (v > maxV) maxV = v;

    return {
      contours: cs,
      projectedCount: projected.length,
      maxValue: maxV,
      singlePointRef,
      totalSpeciesAcrossLocations: totalW,
      totalLocations: projected.length,
    };
  }, [points, region, activeProj, viewBoxW, viewBoxH]);

  // Highest single-location diversity (useful in the header)
  const peakDiversity = useMemo(() => {
    let m = 0;
    const regionGeo = region ? REGION_GEOMETRY[region] : null;
    for (const p of points) {
      if (regionGeo && !geoContains(regionGeo, [p[0], p[1]])) continue;
      const w = (p.length >= 3 && Number.isFinite(p[2])) ? p[2] : 1;
      if (w > m) m = w;
    }
    return m;
  }, [points, region]);

  // Effective native-species count per region.
  //
  // Preferred source: the parser's pre-computed regionNativeCount in csvMeta.
  // This is exact because it reads every CSV row's State/Province directly.
  //
  // Fallback: compute on the fly from the `locations` array — each location
  // has its native species set, so we union them into per-region sets using
  // geoContains for assignment. This covers the case where the user uploaded
  // their CSV under an older parser version that didn't yet emit
  // regionNativeCount, so the regional counter shows real numbers without
  // forcing another re-upload. Only the lng/lat → region lookup runs at
  // mount, and only when the parser data is missing.
  const effectiveRegionNativeCount = useMemo(() => {
    if (regionNativeCount && Object.keys(regionNativeCount).length > 0) {
      return regionNativeCount;
    }
    if (!Array.isArray(locations) || locations.length === 0) return {};
    const sets = {};
    for (const loc of locations) {
      if (!loc || !Array.isArray(loc.species) || loc.species.length === 0) continue;
      for (const r of REGIONS) {
        const geo = REGION_GEOMETRY[r.id];
        if (geo && geoContains(geo, [loc.lng, loc.lat])) {
          if (!sets[r.id]) sets[r.id] = new Set();
          for (const s of loc.species) sets[r.id].add(s);
          break; // each location belongs to exactly one region
        }
      }
    }
    const out = {};
    for (const [id, set] of Object.entries(sets)) out[id] = set.size;
    return out;
  }, [regionNativeCount, locations]);

  // ---- Share card: 1080×1920 portrait PNG (9:16) sized for IG/Stories ----
  async function shareCard() {
    if (sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      const svgEl = svgContainerRef.current?.querySelector('svg');
      if (!svgEl) throw new Error('Map not ready');

      // Pre-warm fonts so canvas draws Montserrat, not a fallback
      try {
        if (document.fonts) {
          await Promise.all([
            document.fonts.load('700 280px Fredoka'),
            document.fonts.load('700 56px Fredoka'),
            document.fonts.load('700 42px Fredoka'),
            document.fonts.load('600 36px Fredoka'),
            document.fonts.load('700 28px Fredoka'),
            document.fonts.load('700 64px Fredoka'),
          ]);
        }
      } catch {
        // Non-fatal; canvas will fall back to system-ui
      }

      // Clone the SVG and strip the very-subtle state fills — those rgba
      // white-on-dark polygons create a barely-visible lighter rectangle around
      // the US that breaks the dark-on-dark blend we want for the share card.
      // The state borders (drawn separately) still trace the actual US shape.
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.querySelectorAll('path[fill="rgba(255,255,255,0.03)"]').forEach((p) => p.remove());

      const xml = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Load SVG into an Image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('SVG load failed'));
        img.src = svgUrl;
      });

      // Load the current session's bird mascot PNG to draw next to the
      // "Birder" wordmark. Same image that's in the dashboard banner so
      // the share is visually consistent with what the sharer is looking at.
      const mascotImg = new Image();
      mascotImg.crossOrigin = 'anonymous';
      try {
        await new Promise((resolve, reject) => {
          mascotImg.onload = resolve;
          mascotImg.onerror = () => reject(new Error('Mascot load failed'));
          mascotImg.src = CURRENT_MASCOT.src;
        });
      } catch {
        // Non-fatal: if the mascot fails to load, we just skip drawing it.
      }

      // 9:16 portrait — Instagram Stories / Reels / TikTok native dimensions
      const W = 1080, H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // --- helpers ---
      function rrPath(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      }
      function drawGlass(x, y, w, h, r) {
        // Glassy fill: very subtle top-to-bottom highlight
        rrPath(x, y, w, h, r);
        const fillGrad = ctx.createLinearGradient(0, y, 0, y + h);
        fillGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        fillGrad.addColorStop(1, 'rgba(255,248,232,0.95)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
        // Beveled border: brighter at top, dimmer at bottom — the "Liquid Glass" cue
        rrPath(x, y, w, h, r);
        const borderGrad = ctx.createLinearGradient(0, y, 0, y + h);
        borderGrad.addColorStop(0, 'rgba(42,52,69,0.3)');
        borderGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
        borderGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // === Background: subtle vertical gradient (lighter top → deeper bottom) ===
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#6cb8e4');
      bgGrad.addColorStop(0.35, '#a8d8eb');
      bgGrad.addColorStop(1, '#f8d9a8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Warm orange halo behind the hero card for depth
      const halo = ctx.createRadialGradient(W / 2, 420, 80, W / 2, 420, 700);
      halo.addColorStop(0, 'rgba(255, 224, 102, 0.20)');
      halo.addColorStop(0.5, 'rgba(255, 224, 102, 0.08)');
      halo.addColorStop(1, 'rgba(255, 224, 102, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      const count = userCount ?? 0;
      const pct = (count / TOTAL) * 100;
      const cx = W / 2;

      // === Top-left logo: PNG bird mascot + "Birder" wordmark ===
      // Uses the same randomly-chosen-per-session mascot that's in the
      // dashboard banner so the share looks like a screenshot of the app
      // they're sharing, not a different design.
      if (mascotImg && mascotImg.complete && mascotImg.naturalWidth) {
        ctx.drawImage(mascotImg, 50, 40, 80, 80);
      }

      ctx.font = '700 56px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#2a3445';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Birder', 140, 100);

      // === Hero glass card: count + percentage ===
      const heroX = 60, heroY = 180, heroW = 960, heroH = 480;
      drawGlass(heroX, heroY, heroW, heroH, 36);

      ctx.textAlign = 'center';

      // Eyebrow inside hero
      ctx.font = '700 18px Nunito, system-ui, sans-serif';
      ctx.fillStyle = '#5fa8d3';
      ctx.fillText('LIFE LIST', cx, heroY + 50);

      // Giant count
      ctx.font = '700 260px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText(`${count}`, cx, heroY + 280);

      // "of 774 native US birds"
      ctx.font = '600 36px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#5a4a3e';
      ctx.fillText(`of ${TOTAL} native US birds`, cx, heroY + 345);

      // Orange accent line
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 56, heroY + 388);
      ctx.lineTo(cx + 56, heroY + 388);
      ctx.stroke();

      // Percentage (orange)
      ctx.font = '700 40px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText(`${pct.toFixed(1)}% complete`, cx, heroY + 440);

      // === Stats strip: three small glass cards ===
      const stripY = heroY + heroH + 30; // y=690
      const stripH = 150;
      const gap = 12;
      const cardW = (W - 60 * 2 - gap * 2) / 3;

      const stats = [
        {
          label: 'FAMILIES',
          value: `${familiesSeen}`,
          sub: `of ${FAMILY_BOUNDARIES.length}`,
          color: '#2a3445',
        },
        {
          label: 'AT-RISK',
          value: `${atRiskSeen}`,
          sub: 'IUCN threatened',
          color: '#ff6b6b',
        },
        {
          label: 'LOCATIONS',
          value: locationCount.toLocaleString(),
          sub: 'birded',
          color: '#2a3445',
        },
      ];

      stats.forEach((s, i) => {
        const x = 60 + i * (cardW + gap);
        drawGlass(x, stripY, cardW, stripH, 22);

        const cxStat = x + cardW / 2;
        // Label (mono, eyebrow)
        ctx.font = '700 14px Nunito, system-ui, sans-serif';
        ctx.fillStyle = '#5a4a3e';
        ctx.fillText(s.label, cxStat, stripY + 36);
        // Big number
        ctx.font = '700 64px Fredoka, system-ui, sans-serif';
        ctx.fillStyle = s.color;
        ctx.fillText(s.value, cxStat, stripY + 100);
        // Sub-label
        ctx.font = '600 14px Nunito, system-ui, sans-serif';
        ctx.fillStyle = '#7a6a55';
        ctx.fillText(s.sub, cxStat, stripY + 125);
      });

      // === Map with feathered edge fade ===
      const mapW = 1040;
      const mapH = Math.round(mapW * (MAP_H / MAP_W));
      const mapX = (W - mapW) / 2;
      const mapY = stripY + stripH + 40; // y=920

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mapW;
      tempCanvas.height = mapH;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0, mapW, mapH);

      tempCtx.globalCompositeOperation = 'destination-out';
      const fadePx = Math.round(mapW * 0.08);
      let fg = tempCtx.createLinearGradient(0, 0, fadePx, 0);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(0, 0, fadePx, mapH);
      fg = tempCtx.createLinearGradient(mapW - fadePx, 0, mapW, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(mapW - fadePx, 0, fadePx, mapH);
      fg = tempCtx.createLinearGradient(0, 0, 0, fadePx);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(0, 0, mapW, fadePx);
      fg = tempCtx.createLinearGradient(0, mapH - fadePx, 0, mapH);
      fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      tempCtx.fillStyle = fg; tempCtx.fillRect(0, mapH - fadePx, mapW, fadePx);

      ctx.drawImage(tempCanvas, mapX, mapY);

      // === Caption + CTA at the bottom ===
      ctx.textAlign = 'center';
      ctx.font = '700 42px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#2a3445';
      ctx.fillText(`How many have YOU found?`, cx, 1730);

      ctx.font = '700 28px Fredoka, system-ui, sans-serif';
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText(`Find yours at Birder`, cx, 1782);

      URL.revokeObjectURL(svgUrl);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
      if (!blob) throw new Error('Image encoding failed');

      const file = new File([blob], 'birder.png', { type: 'image/png' });

      // Prefer the Web Share API on mobile (iOS 15+, recent Android)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Birder',
          text: `${count}/${TOTAL} native US bird species · ${pct.toFixed(1)}%`,
        });
      } else {
        // Fallback for older iOS, desktop, or browsers without file-sharing
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `birder-${count}-of-${TOTAL}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        // AbortError just means the user dismissed the share sheet — not an error
        setShareError(err?.message || 'Share failed');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="relative max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col"
      style={{ minHeight: '100vh' }}
    >
      {/* ===== Map page header — chunky mint banner =====
          Mint-green gradient with thick dark-mint border + offset shadow.
          The back button reads "Home" (matching the homepage's chunky vibe)
          rather than "Census" or "Birder" wordmarking — quicker to parse on
          a small screen and consistent with how Animal Crossing menus label
          their back actions. */}
      <header
        className="anim-1 relative flex items-center justify-between mb-3 shrink-0"
        style={{
          background: 'linear-gradient(135deg, #7dd3a4 0%, #a8e6cf 100%)',
          border: '3px solid #2e6b4f',
          boxShadow: '0 4px 0 0 #2e6b4f',
          borderRadius: 22,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back to home"
          className="inline-flex items-center gap-1.5"
          style={{
            background: '#fff',
            border: '2.5px solid #2e6b4f',
            borderRadius: 999,
            padding: '6px 14px 6px 10px',
            color: '#2e6b4f',
            boxShadow: '0 2px 0 0 #2e6b4f',
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <ChevronLeft size={14} strokeWidth={3} />
          Home
        </button>
        <div
          className="font-display"
          style={{
            fontWeight: 700, fontSize: 13, color: '#fff',
            textShadow: '0 1.5px 0 #2e6b4f',
            letterSpacing: '0.08em',
          }}
        >
          MY MAP
        </div>
      </header>

      {/* Filter pills (All sightings / First sightings) — temporarily hidden.
          The `mode` state still defaults to 'all', so the map shows all
          sightings and the first-sightings heat logic remains fully intact.
          To bring the toggle back, un-comment this block. */}
      {/*
      <div className="anim-2 mb-3 grid grid-cols-2 gap-2 shrink-0">
        <button
          onClick={() => setMode('all')}
          aria-pressed={mode === 'all'}
          className={mode === 'all' ? 'btn-ink' : 'btn-ghost'}
          style={{
            borderRadius: 999, padding: '8px 12px', fontSize: 13,
          }}
        >
          All sightings
        </button>
        <button
          onClick={() => setMode('first')}
          aria-pressed={mode === 'first'}
          title="Heat by first-found location of each species"
          className={mode === 'first' ? 'btn-ink' : 'btn-ghost'}
          style={{
            borderRadius: 999, padding: '8px 12px', fontSize: 13,
          }}
        >
          First sightings
        </button>
      </div>
      */}

      {/* Map card — flex-1 to consume remaining vertical space so the page
          fits the viewport without scrolling. Cream gradient background to
          match the Birdfolk paper look — states sit on this lightly tinted
          background like a watercolor wash. */}
      <div
        className="anim-4 overflow-hidden relative flex-1 min-h-0 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #f0fafb 0%, #fffaeb 100%)',
          border: '3px solid #2a3445',
          boxShadow: '0 4px 0 0 #2a3445',
          borderRadius: 22,
        }}
      >

        {/* map body — flex-1 itself so the SVG fills whatever space is left
            inside the card after the counter and share footer are accounted
            for. */}
        <div className="relative flex-1 min-h-0 overflow-hidden p-4 sm:p-5 flex flex-col">
          {/* Counter — centered & oversized, mirroring the home-page hero
              count. Scope label + optional "← USA" pill sit above the big
              number; locations + "tap to zoom" hint sit below. */}
          <div className="shrink-0 mb-3 text-center">
            <div className="font-mono text-[9px] sm:text-[10px] ink-faint tracking-[0.25em] uppercase mb-2 flex items-center justify-center gap-2 flex-wrap">
              <span>Native species</span>
              <span className="ink-faint">·</span>
              <span className="rust" style={{ fontWeight: 600 }}>{activeName}</span>
              {region && (
                <button
                  onClick={() => setRegion(null)}
                  className="btn-ghost rounded-full px-2 py-0.5 inline-flex items-center gap-1 ml-1"
                  style={{ fontSize: '8.5px', letterSpacing: '0.15em' }}
                  aria-label="Zoom out to USA"
                >
                  <ChevronLeft size={10} strokeWidth={2.25} />
                  USA
                </button>
              )}
            </div>
            <div className="flex items-baseline justify-center gap-2 flex-wrap">
              <div
                className="font-display ink leading-none"
                style={{ fontWeight: 800, fontSize: 'clamp(2.75rem, 10vw, 4.25rem)', letterSpacing: '-0.02em' }}
              >
                {region ? (effectiveRegionNativeCount[region] ?? 0) : (userCount ?? 0)}
              </div>
              <div
                className="font-display ink-faint leading-none"
                style={{ fontWeight: 500, fontSize: 'clamp(1rem, 3.5vw, 1.5rem)' }}
              >
                / {TOTAL}
              </div>
            </div>
            <p className="ink-soft text-[11px] sm:text-xs mt-2">
              {mode === 'first' ? (
                <>
                  {totalLocations > 0 ? (
                    <>
                      <span className="rust font-mono" style={{ fontWeight: 600 }}>{totalLocations.toLocaleString()}</span> first-found
                      location{totalLocations === 1 ? '' : 's'}
                    </>
                  ) : 'no first-found locations in scope'}
                  {!region && ' · tap a region to zoom in'}
                </>
              ) : (
                <>
                  {totalLocations > 0 ? (
                    <>
                      <span className="rust font-mono" style={{ fontWeight: 600 }}>{totalLocations.toLocaleString()}</span> location{totalLocations === 1 ? '' : 's'}
                      {peakDiversity > 0 && (
                        <>
                          {' · peak '}
                          <span className="font-mono ink" style={{ fontWeight: 600 }}>{peakDiversity}</span> at one spot
                        </>
                      )}
                    </>
                  ) : 'no locations in scope'}
                  {!region && ' · tap a region to zoom in'}
                </>
              )}
            </p>
          </div>

          {/* SVG wrapper — always rendered so that even a region with no
              sightings still shows its outline + states. Only the contour
              heat layer is conditional on having projected points. A small
              centered hint floats over the map area when empty. */}
          <div className="relative flex-1 min-h-0 flex flex-col w-full" ref={svgContainerRef}>
            <div className="flex-1 min-h-0 flex items-center justify-center relative">
              <svg
                viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
                xmlns="http://www.w3.org/2000/svg"
                className="max-w-full max-h-full"
                preserveAspectRatio="xMidYMid meet"
                style={{ background: 'transparent', width: '100%', height: '100%' }}
              >
                <defs>
                  {/* A *dilated* clip for the heatmap. With a strict clipPath
                      tied to the literal outline, coastal hotspots get their
                      gaussian blobs sliced off at the coastline — and thin
                      barrier-island spots like the Outer Banks barely render
                      at all because the blob is mostly out over water. Using a
                      mask with a stroked + filled path lets the heat bleed
                      roughly 15 user-units past the coast. The mask outline is
                      `activeOutline` so it tracks the current zoom scope —
                      USA when full, region polygon when zoomed. */}
                  <mask id="us-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={viewBoxW} height={viewBoxH}>
                    <rect x={0} y={0} width={viewBoxW} height={viewBoxH} fill="black" />
                    <path
                      d={activePath(activeOutline) || ''}
                      fill="white"
                      stroke="white"
                      strokeWidth={30}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </mask>
                </defs>

                {/* State fills. When zoomed to a region, states outside the
                    region get a much fainter fill so the region reads as the
                    focal area but neighbors remain as visual context.
                    On the full US view, every state is clickable to zoom
                    into its region. */}
                <g>
                  {STATES.features.map((s) => {
                    const abbr = FIPS_TO_ABBR[s.id];
                    const rid = STATE_TO_REGION[abbr];
                    const inActive = !region || rid === region;
                    const clickable = !region && !!rid;
                    return (
                      <path
                        key={s.id}
                        d={activePath(s) || ''}
                        // Pale mint wash for active states, even paler for
                        // inactive (out-of-region) so the active region pops
                        fill={inActive ? '#c8e6c8' : 'rgba(200,230,200,0.30)'}
                        stroke="none"
                        onClick={clickable ? () => setRegion(rid) : undefined}
                        style={{ cursor: clickable ? 'pointer' : 'default' }}
                      />
                    );
                  })}
                </g>

                {/* National Park outlines — only when zoomed into a region.
                    A faint dark-green stroke + very light green fill, drawn
                    BELOW the heat contours so the heatmap always reads on top
                    and the parks sit as subtle context. Parks are pre-grouped
                    by region (PARKS_BY_REGION) so we only draw the handful in
                    the active region. */}
                {region && PARKS_BY_REGION[region] && PARKS_BY_REGION[region].length > 0 && (
                  <g>
                    {PARKS_BY_REGION[region].map((park, i) => (
                      <path
                        key={`park-${i}`}
                        d={activePath(park) || ''}
                        fill="rgba(46,107,79,0.10)"
                        stroke="rgba(46,107,79,0.45)"
                        strokeWidth={0.75}
                        strokeLinejoin="round"
                      >
                        <title>{park.properties.name} National Park</title>
                      </path>
                    ))}
                  </g>
                )}

                {/* Heatmap contours, masked to a *dilated* outline so coastal
                    and barrier-island hotspots remain visible. */}
                <g mask="url(#us-mask)">
                  {contours.map((c, i) => (
                    <path
                      key={i}
                      d={PIXEL_PATH(c) || ''}
                      fill={heatColor(densityT(c.value, singlePointRef))}
                      stroke="none"
                    />
                  ))}
                </g>

                {/* Internal state borders — soft mint */}
                <path
                  d={activePath(STATE_BORDERS) || ''}
                  fill="none"
                  stroke="#7ab87a"
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />

                {/* Region division borders — only on the full US view. Coral
                    dashed so they read as distinct tap-target dividers. */}
                {!region && (
                  <path
                    d={activePath(REGION_BORDERS) || ''}
                    fill="none"
                    stroke="#ff9a76"
                    strokeWidth={1.4}
                    strokeDasharray="4,2"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                )}

                {/* Outer border for the active scope — dark mint. */}
                <path
                  d={activePath(activeOutline) || ''}
                  fill="none"
                  stroke="#2e6b4f"
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              </svg>
              </div>

              {/* Continuous gradient legend */}
              <div className="mt-2 flex items-center justify-center gap-3 flex-wrap shrink-0">
                <span className="font-mono text-[10px] ink-faint tracking-widest uppercase">Few species</span>
                <svg width="160" height="12" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="legend-grad" x1="0" y1="0" x2="1" y2="0">
                      {Array.from({ length: 21 }).map((_, i) => {
                        const t = i / 20;
                        return <stop key={i} offset={`${(t * 100).toFixed(0)}%`} stopColor={heatColor(t)} />;
                      })}
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="160" height="12" fill="url(#legend-grad)" stroke="rgba(42,52,69,0.4)" strokeWidth="0.8" rx="6" />
                </svg>
                <span className="font-mono text-[10px] ink-faint tracking-widest uppercase">Many species</span>
              </div>

              {/* Empty-state overlay — sits on top of the rendered map when
                  there are no sightings to draw contours from. Lets the
                  user still see the region's geography so the zoom is
                  obviously working. */}
              {projectedCount === 0 && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-xs sm:text-sm pointer-events-none">
                  {mode === 'first' && !firstAvailable ? (
                    <span
                      className="inline-block px-3 py-2 rounded-xl"
                      style={{
                        pointerEvents: 'auto',
                        background: '#fff8e8',
                        color: '#2a3445',
                        border: '2px solid #2a3445',
                        boxShadow: '0 2px 0 0 #2a3445',
                      }}
                    >
                      First-sightings data isn't in storage yet — re-upload your
                      <span className="font-mono"> MyEBirdData.csv </span>
                      from Settings to enable this view.
                    </span>
                  ) : (
                    <span
                      className="inline-block px-3 py-1.5 rounded-xl"
                      style={{
                        background: '#fff8e8',
                        color: '#2a3445',
                        border: '2px solid #2a3445',
                        boxShadow: '0 2px 0 0 #2a3445',
                        fontWeight: 600,
                      }}
                    >
                      no sightings {region ? 'in this region' : 'mapped yet'}
                    </span>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* footer */}
        <div className="relative px-4 sm:px-6 py-3 border-t rule flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase hidden sm:inline">
            {projectedCount.toLocaleString()} of {points.length.toLocaleString()} locations mapped
            {projectedCount < points.length && ' (others outside lower 48 / AK / HI)'}
          </span>
          <span className="font-mono text-[10px] ink-faint tracking-wider uppercase sm:hidden">
            {projectedCount.toLocaleString()} / {points.length.toLocaleString()} loc.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={shareCard}
              disabled={sharing || projectedCount === 0}
              className="btn-ink rounded-full px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
              aria-label="Share heatmap image"
            >
              {sharing ? <RefreshCw size={12} className="animate-spin" /> : <Share2 size={12} />}
              {sharing ? 'Building…' : 'Share'}
            </button>
          </div>
        </div>
        {shareError && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs" style={{
            background: 'rgba(127, 29, 29, 0.95)',
            color: '#f5f5f4',
            border: '1px solid rgba(248, 113, 113, 0.30)',
          }}>
            {shareError}
          </div>
        )}
      </div>

      {/* Page-level attribution footer — same on dashboard and map page. */}
      <footer className="mt-4 pt-3 border-t rule text-center anim-5 shrink-0">
        <p className="font-mono text-[9px] ink-faint tracking-[0.25em] uppercase leading-relaxed">
          Sightings · ebird (Cornell Lab of Ornithology)<br />
          Total · ABA Checklist v8.0.7
        </p>
      </footer>
    </div>
  );
}
