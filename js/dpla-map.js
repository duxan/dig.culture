var map;
var oms;
var count_DPLA = 0;
var count_Eu = 0;

function main() {
    if (Modernizr.geolocation) {
        navigator.geolocation.watchPosition(makeMap);
    } else {
        displayError();
    }
}

function makeMap(position) {
    geo_lat = parseFloat(position.coords.latitude);
    geo_lon = parseFloat(position.coords.longitude);
    var loc = new google.maps.LatLng(geo_lat, geo_lon);
	console.log('Geo API: ' + geo_lat + ', ' + geo_lon);
    var opts = {
        zoom: getZoom() - 4,
        center: loc,
        mapTypeId: google.maps.MapTypeId.TERRAIN  
    };

    map = new google.maps.Map(document.getElementById("map_canvas"), opts);
    oms = new OverlappingMarkerSpiderfier(map, {markersWontMove: true, markersWontHide: true});
    var info = new google.maps.InfoWindow();
    oms.addListener('click', function(marker) {
	console.log('Click');
	info.setContent(marker.desc);
	info.open(map, marker);
    });
    var marker = new google.maps.Marker({
        map: map,
        position: loc,
        icon: getCenterpin(),
        title: 'Trenutna pozicija',
    });
	lookupDocs();
    google.maps.event.addListener(map, 'zoom_changed', function(){clearMarkers();lookupDocs();});
}

function lookupDocs() {
	var scaler = map.getZoom()/10;
	console.log('Zoom level: ' + map.getZoom());
    radius = parseInt((((Math.abs(geo_lat-41.87)+Math.abs(geo_lat-46.17))*60/1.855/2)+((Math.abs(geo_lon-18.85)+Math.abs(geo_lon-23))*60/1.855/2))/scaler) + "km";
	console.log('Fetch radius: ' + radius);
	$.ajax({
	type: "POST", 
	url: "index.php",
	data: ({
		dpla: true,
		radius: radius, 
		lat: geo_lat, 
		lon: geo_lon
		}),
	success: function(ajaxdata){
		console.log(IsJson(ajaxdata));
		displayDocs(JSON.parse(ajaxdata));
		}
	});
	$.ajax({
	type: "POST", 
	url: "index.php",
	data: ({
		europeana: true,
		radius: scaler, 
		lat: geo_lat, 
		lon: geo_lon
		}),
	success: function(ajaxdata){
		console.log(IsJson(ajaxdata));
		displayDocs(JSON.parse(ajaxdata));
		}
	});
}

function clearMarkers() {
	$('#marker_info #eu').empty();
    var markers = oms.getMarkers();
    for (var i=0; i < markers.length; i++) {
	markers[i].setMap(null);
    }
    oms.clearMarkers();
}

function displayDocs(data) {
    count_DPLA = 0;
    count_Eu = 0;
    //clearMarkers();
	if (data.docs){
		$.each(data.docs, displayDoc);
		console.log('DPLA points mapped: ' + count_DPLA);
	} else if (data.items) {
		$.each(data.items, displayEuDoc);
		console.log('Europeana points mapped: ' + count_Eu);
	}
}

function displayDoc(index, doc) {
    count_DPLA += 1;
    var loc; 
    $(doc.sourceResource.spatial).each(function(i,coord) {
	var coords = coord.coordinates;
        if (coords && !loc) {
            coords = coords.split(",");
            var lat = parseFloat(coords[0]);
            var lon = parseFloat(coords[1]);
            loc = new google.maps.LatLng(lat, lon);
	 }
    });

    // create a marker for the subject
    if (loc) {
		var source = doc.sourceResource;
	    var title = source.title;
		// place images
		if (doc.hasView && doc.hasView[0] && doc.hasView[0].format && doc.hasView[0].format.split('/')[0]=='image'){
				img = '<a title="' + title + '" target="_new" href="' + doc.hasView[0].url + '"><img style="margin:2px;width:100px; height:100px;" src="' + doc.hasView[0].url + '"/></a>';
				$('#marker_info #eu').append(img);
			} else {
				img='';
			};
			
	    
	    var description = '';
	    if ('description' in source) {
                 description = source.description;
            }
	    var date = '';
	    if ('date' in source) {
                date = ' (' + source.date.displayDate + ') ';
            }
            var provider = doc.provider.name;
	    var providerId = doc.provider['@id'];

            var icon = getPushpin();

            var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                position: loc,
				title: title + ' -- ' + provider + date
            });

            var recordId = doc['@id'];
	    // No link to the record included.  What a pain in the butt! Make our own
	    var recordUrl = recordId.replace('http://dp.la/api/items','http://dp.la/item');
            var viewUrl = doc.isShownAt
			
            // add a info window to the marker so that it displays when 
            // someone clicks on the marker
            var item = '<a target="_new" href="' + recordUrl + '">' + title + '</a>' + date;
            provider = '<a target="_new" href="' + viewUrl + '">' + provider + '</a>.';
            var html = '<span class="map_info">' + item + ' from ' + provider + ' ' + description + '<br/>' + img + '</span>';
	    marker.desc = html;
	    oms.addMarker(marker);
		//$('#marker_info #dpla').append(img);
        }
}

function displayEuDoc(index, doc) {
    count_Eu += 1;
	var lat_i;
	var lon_i;
    var loc; 
if(doc.edmPlaceLatitude && doc.edmPlaceLongitude){
	for (var i = 0; i < $(doc.edmPlaceLatitude).length; i++) {
	var latit = parseFloat($(doc.edmPlaceLatitude)[i]);
		if (latit!=0 && latit>=41.87 && latit<=46.17){
		lat_i = i;
		}
	};
	for (var i = 0; i < $(doc.edmPlaceLongitude).length; i++) {
	var longit = parseFloat($(doc.edmPlaceLongitude)[i]);
		if (longit!=0 && longit>=18.85 && longit<=23){
		lon_i = i;
		}
	};
	if (lat_i==lon_i){
	lat_eu = $(doc.edmPlaceLatitude)[lat_i];
	lon_eu = $(doc.edmPlaceLongitude)[lon_i];
	};
};
    loc = new google.maps.LatLng(lat_eu, lon_eu);
	
	// create a marker for the subject
    if (loc) {
	var title = doc.title[0];
	// place images
	if (doc.type=="IMAGE" && doc.edmPreview){
				preview = '<img style="margin:2px;width:100px; height:100px;" src="' + doc.edmPreview + '"/>';
			} else {
				preview = "";
	};
	if (index<=10){
			$('#marker_info #eu').append('<a title="' + title + '" target="_new" href="' + doc.guid + '">' + preview + '</a>');
	};
	    

            var icon = getPushpinEu();
			
            var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                position: loc,
				title: title 
            });
           
            provider = '<a target="_new" href="' + doc.guid + '">više u <strong>Europeana</strong></a>.';
            var html = '<span class="map_info">' + title + '<br/>' + provider + '<a target="_new" href="' + doc.guid + '"><br/>' + preview + '</a></span>';
	    marker.desc = html;
	    oms.addMarker(marker);
		}
}

function displayError() {
    html = "<p class='error'>Your browser doesn't seem to support the HTML5 geolocation API. You will need either: Firefox (3.5+), Safari (5.0+) Chrome (5.0+), Opera (10.6+), iPhone (3.0+) or Android (2.0+). Sorry!</p>";
    $("#subject_list").replaceWith(html);
}

function getPushpin() {
    return getPin("http://maps.google.com/mapfiles/kml/pushpin/blue-pushpin.png");
}

function getPushpinEu() {
    return getPin("http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png");
}

function getCenterpin() {
    return getPin("http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png");
}

function getPin(url) {
    size = 30;
    return new google.maps.MarkerImage(url, new google.maps.Size(64, 64), new google.maps.Point(0, 0), new google.maps.Point(0, size), new google.maps.Size(size, size));
}

function getZoom() {
    if (is_handheld()) {
        return 15;
    } else {
        return 12;
    }
}

function IsJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
