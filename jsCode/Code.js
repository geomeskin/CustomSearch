require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/widgets/LayerList",
  "esri/widgets/Legend",
  "esri/widgets/Search",
  "esri/tasks/Locator",
  "esri/renderers/UniqueValueRenderer",
  "esri/widgets/Expand",
  "esri/tasks/IdentifyTask",
  "esri/tasks/support/IdentifyParameters"
  ],
  function(
    Map, 
    MapView,
    FeatureLayer,
    LayerList,
    Legend,
    Search,
    Locator,
    UniqueValueRenderer,
    Expand,
    IdentifyTask, 
    IdentifyParameters
  ) {

  //The unique value renderer used to display the BUILDINGS.
  var rendBldg = new UniqueValueRenderer({
    field: "PolygonStatus",
    defaultsymbol: { type: "simple-fill" }
  });
  rendBldg.addUniqueValueInfo({
    value: "Ready for Review",
    symbol: {
      type: "simple-fill",
      outline: { 
        style: "dash", 
        width: 1.5, 
        color: [12, 92, 3, 1] }, // outline
      color: [5, 250, 38, 0.5] // fill
    }
  });       
  rendBldg.addUniqueValueInfo({
    value: "Under Review",
    symbol: {
      type: "simple-fill",
      outline: { 
        width: 1.5, 
        color: [255, 0, 0, 1] }, // outline
      color: [255, 0, 0, 0.5] // fill
    }
  });    
  rendBldg.addUniqueValueInfo({
    value: "Reviewed - Approved",
    symbol: {
      type: "simple-fill",
      outline: { 
        width: 1.5, 
        color: [12, 92, 3, 1] }, // outline
      color: [157, 220, 149, 0.95] // fill
    }
  });    
  rendBldg.addUniqueValueInfo({
    value: "Requires Maintenance",
    symbol: {
      type: "simple-fill",
      outline: { 
        width: 1.5, 
        color: [255, 0, 0, 1] }, // outline
      color: [217, 100, 61, 0.95] // fill
    }
  }); // END BUILDING symbology

  //The unique value renderer used to display the YARDS.
  var rendYard = new UniqueValueRenderer({
    field: "PolygonStatus",
    defaultsymbol: { type: "simple-fill" }
  });
  rendYard.addUniqueValueInfo({
    value: "Ready for Review",
    symbol: {
      type: "simple-fill",
      outline: { 
        style: "dash", 
        width: 1.5, 
        color: [12, 92, 3, 1] }, //outline
      color: [255, 255, 255, 0] // fill
    }
  });       
  rendYard.addUniqueValueInfo({
    value: "Under Review",
    symbol: {
      type: "simple-fill",
      outline: { 
        width: 1.5, 
        color: [255, 0, 0, 1] }, // outline
      color: [255, 0, 0, 0] // fill
    }
  });
  rendYard.addUniqueValueInfo({
    value: "Reviewed - Approved",
    symbol: {
      type: "simple-fill",
      outline: { 
        width: 1.5, 
        color: [12, 92, 3, 1] }, // outline
      color: [157, 220, 149, 0] // fill
    }
  });
  rendYard.addUniqueValueInfo({
    value: "Requires Maintenance",
    symbol: {
      type: "simple-fill",
      outline: { 
        width: 1.5, 
        color: [255, 0, 0, 1] }, // outline
      color: [217, 100, 61, 0]  // fill
    }
  }); // END YARD symbology


  var map = new Map({
      basemap: "streets"
    });

  var view = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 10,
    center: [-94.2088, 36.3729] // LON, LAT
  });

  //Create the Search widget
  var searchWidget = new Search({
    view: view, //View to assign the widget to
    allPlaceholder: "Enter LOC or code",
    suggestionEnabled: true,
    includeDefaultSources : false,
    maxSuggestions: 5000,
    maxResults: 5000,
    
    //Sources for the Search
    sources: [
      {
        //Locator
        locator: new Locator({
          url: "//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
        }),
        singleLineFieldName: "SingleLine",
        outFields: ["Addr_type"], //Specify the fields to return from the search
        //Source name that appears in the Search widget for the locator
        name: "World Geocode", //Name to appear in the search widget
        placeholder: "Address/Code"
      },
      {
        // FeatureLayer
        layer: new FeatureLayer({
          url:
            "https://gis.jbhunt.com/server/rest/services/LocDigV2_CreateData_PRD/FeatureServer/3",
          popupTemplate: {
            title: "Location Code: {LocationCode}",
            overwriteActions: true,
            content: [
              {
                type: "fields",
                fieldInfos: [{
                    fieldName: "LocationCat",
                    label: "Location Category"
                  },
                  {
                    fieldName: "LocationName",
                    label: "Location Name"
                  },
                  {
                    fieldName: "LocationCode",
                    label: "Location Code"
                  }]
              }
            ]
          }
        }),
        searchFields: ["LocationCode"],
        suggestionTemplate: "{LocationCode}",
        exactMatch: false,
        outFields: ["*"],
        orderByFields: ["LocationCode ASC"],
        //Source name that appears in the Search widget for the Feature Layer
        name: "JBH Location Code",
        zoomScale: 25000,
        //Symbolizing the result.
        resultSymbol: {
          type: "simple-marker",
          color: [51, 51, 204, 0.7],
          size: 10,
          style: "circle",
          outline: {
            color: "red",
            width: 1
          }
        }
      }
    ]
  });

  // Handle the click for the IDENTIFY task
  view.when(function () {
    // executeIdentifyTask() is called each time the view is clicked
    view.on("click", executeIdentifyTask);

    // Create identify task for the specified map service
    identifyTask = new IdentifyTask(mapServiceURL);

    // Set the parameters for the Identify
    params = new IdentifyParameters();
    params.tolerance = 6;
    params.layerIds = [0, 1, 2, 3];  // all the layers in the listed mapservice
    params.layerOption = "all"; // "top"|"visible"|"all"
    params.width = view.width;
    params.height = view.height;
  });

  // Executes each time the view is clicked
  function executeIdentifyTask(event) {
    // Set the geometry to the location of the view click
    params.geometry = event.mapPoint;
    params.mapExtent = view.extent;
    document.getElementById("viewDiv").style.cursor = "wait";

    // This function returns a promise that resolves to an array of features
    // A custom popupTemplate is set for each feature based on the layer it
    // originates from
    identifyTask
      .execute(params)
      .then(function (response) {
        var results = response.results;

        return results.map(function (result) {
          var feature = result.feature;
          var layerName = result.layerName;

          feature.attributes.layerName = layerName;
          console.log("Layer clicked: " + layerName)
          if (layerName === "Buildings") {
            feature.popupTemplate = {
              // autocasts as new PopupTemplate()
              title: "Building INFO",
              content:
                "<table><tr><td><b>Location Category:</b></td><td> {Location Category}</td></tr>" +
                "<tr><td><b>Location Code:</b></td><td> {Location Code}</td></tr>" +
                "<tr><td><b>Location Name:</b></td><td> {Location Name}</td></tr>" +
                "<tr><td><b>Polygon Status:</b></td><td> {Polygon Status}</td></tr>" +
                "<tr><td><b>Polygon Type:</b></td><td> {Polygon Type}</td></tr>" +
                "<tr><td><b>MultiCode Location:</b></td><td> {MultiCode Location}</td></tr>" +
                "<tr><td><b>Location Comments:</b></td><td> {Location Comments}</td></tr>" +
                "<tr><td><b>Approval Comments:</b></td><td> {Approval Comments}</td></tr>" +
                "<tr><td><b>Create UserID:</b></td><td> {Create UserID}</td></tr></table>"
        };
          } else if (layerName === "Yards") {
            feature.popupTemplate = {
              // autocasts as new PopupTemplate()
              title: "Yard INFO",
              content:
                "<table><tr><td><b>Location Category:</b></td><td> {Location Category}</td></tr>" +
                "<tr><td><b>Location Code:</b></td><td> {Location Code}</td></tr>" +
                "<tr><td><b>Location Name:</b></td><td> {Location Name}</td></tr>" +
                "<tr><td><b>Polygon Status:</b></td><td> {Polygon Status}</td></tr>" +
                "<tr><td><b>Polygon Type:</b></td><td> {Polygon Type}</td></tr>" +
                "<tr><td><b>MultiCode Location:</b></td><td> {MultiCode Location}</td></tr>" +
                "<tr><td><b>Location Comments:</b></td><td> {Location Comments}</td></tr>" +
                "<tr><td><b>Approval Comments:</b></td><td> {Approval Comments}</td></tr>" +
                "<tr><td><b>Create UserID:</b></td><td> {Create UserID}</td></tr></table>"
            };
          } else if (layerName === "MultiCode Location") {
            feature.popupTemplate = {
              // autocasts as new PopupTemplate()
              title: "MultiCode INFO",
              content:
                "<table><tr><td><b>Location Category:</b></td><td> {Location Category}</td></tr>" +
                "<tr><td><b>Location Code:</b></td><td> {Location Code}</td></tr>" +
                "<tr><td><b>Location Name:</b></td><td> {Location Name}</td></tr>" +
                "<tr><td><b>Status:</b></td><td> {Status}</td></tr>" +
                "<tr><td><b>Create UserID:</b></td><td> {Create UserID}</td></tr>" +
                "<tr><td><b>Create Timestamp:</b></td><td> {Create Timestamp}</td></tr>" +
                "<tr><td><b>Last Update UserID:</b></td><td> {Last Update UserID}</td></tr>" +
                "<tr><td><b>Last Update Timestamp:</b></td><td> {Last Update Timestamp}</td></tr></table>"
          };
          } else if (layerName == "Location Comment") {
            feature.popupTemplate = {
              // autocasts as new PopupTemplate()
              title: "Comment INFO",
              content:
                "<table><tr><td><b>Location Category:</b></td><td> {Location Category}</td></tr>" +
                "<tr><td><b>Comments:</b></td><td> {Comments}</td></tr>" +
                "<tr><td><b>Status:</b></td><td> {Status}</td></tr>" +
                "<tr><td><b>Category:</b></td><td> {Category}</td></tr>" +
                "<tr><td><b>QC Notes:</b></td><td> {QCNotes}</td></tr>" +
                "<tr><td><b>Create UserID:</b></td><td> {Create UserID}</td></tr>" +
                "<tr><td><b>Crate Timestamp:</b></td><td> {Create Timestamp}</td></tr>" +
                "<tr><td><b>Last Update UserID:</b></td><td> {Last Update UserID}</td></tr>" +
                "<tr><td><b>Last Update Timestamp:</b></td><td> {Last Update Timestamp}</td></tr></table>"
          };
          }
          return feature;
        });
      })
      .then(showPopup); // Send the array of features to showPopup()

      // Shows the results of the Identify in a popup once the promise is resolved
      function showPopup(response) {
        if (response.length > 0) {
          view.popup.open({
            features: response,
            location: event.mapPoint
          });
        }
        document.getElementById("viewDiv").style.cursor = "auto";
      }
    }

  var mapServiceURL = "https://gis.jbhunt.com/server/rest/services/LocDigV2_CreateData_PRD/MapServer"
    
  //Create feature layers for the map     
  var layYards = new FeatureLayer({
    url: "https://gis.jbhunt.com/server/rest/services/LocDigV2_CreateData_PRD/FeatureServer/3",
    renderer: rendYard,
    title:  "Yards"
  });
  var layBuildings = new FeatureLayer({
    url: "https://gis.jbhunt.com/server/rest/services/LocDigV2_CreateData_PRD/FeatureServer/2",
    renderer: rendBldg,
    title:  "Buildings"
  });   
  //Add a feature layer to the map
  map.addMany([layYards, layBuildings ]);

  //Create the LEGEND widget
  var mapLegend = new Legend({
    view: view,
    label: "LEGEND",
    respectLayerVisibility: "true",
    style:{
      type: "classic",
      layout: "stack"
    }
  });

  //  Create the EXPAND for the LEGEND
  var expLegend = new Expand({
    view: view,
    content: mapLegend
  });

  // Add the search widget to the top right corner of the view
  view.ui.add(searchWidget, {
    position: "top-right",
    index: 0
  });      
  
  //  Add the LEGEND EXPAND to the page
  view.ui.add(expLegend, {
    position: "top-right",
    index: 2
  });
      
});
