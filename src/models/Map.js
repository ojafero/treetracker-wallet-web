/*
 * The main model for the treetracker model
 */
import  log from "loglevel";
import expect from "expect-runtime";

export default class Map{

  constructor(options){

    options = {...{
      L: window.L,
      minZoom: 2,
      maxZoom: 20,
      initialCenter: [20, 0],
      tileServerUrl: process.env.REACT_APP_TILE_SERVER_URL,
    }, ...options};

    Object.keys(options).forEach(key => {
      this[key] = options[key];
    });
    log.info("options:", options);
  }

  static formatClusterText(count){
    if(count > 1000){
      return `${Math.round(count/1000)}K`;
    }else{
      return count;
    }
  }

  mount(domElement){
    const mapOptions = {
      minZoom: this.minZoom,
      center: this.initialCenter,
    }
    this.map = this.L.map(domElement, mapOptions);

    //google satillite map
    this.layerGoogle = this.L.gridLayer.googleMutant({
      maxZoom: this.maxZoom,
      type: 'satellite'
    });
    this.layerGoogle.addTo(this.map);

    //tile 
    this.layerTile = new this.L.tileLayer(
      `${this.tileServerUrl}{z}/{x}/{y}.png`,
      {
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
      }
    );
    this.layerTile.addTo(this.map);

    this.layerUtfGrid = new this.L.utfGrid(
      `${this.tileServerUrl}{z}/{x}/{y}.grid.json`,
      {
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
      }
    );
    this.layerUtfGrid.on('click', (e) => {
      log.debug("click:", e);
      if (e.data) {
        const [lon, lat] = JSON.parse(e.data.latlon).coordinates;
        if(e.data.zoom_to){
          log.info("found zoom to:", e.data.zoom_to);
          const [lon, lat] = JSON.parse(e.data.zoom_to).coordinates;
          //NOTE do cluster click
          this.map.flyTo([lat, lon], this.map.getZoom() + 2);
        }else{
          this.map.flyTo([lat, lon], this.map.getZoom() + 2);
        }
      }
    });

    this.layerUtfGrid.on('mouseover', (e) => {
      log.debug("mouseover:", e);
      const [lon, lat] = JSON.parse(e.data.latlon).coordinates;
      this.highlightMarker({
        lat,
        lon,
        count: e.data.count,
      });
//      markerHighlight.payload = {
//        id: e.data.id
//      };
    });
    this.layerUtfGrid.on('mouseout', (e) => {
      log.debug("e:", e);
      this.map.removeLayer(this.layerHighlight);
    });
    this.layerUtfGrid.addTo(this.map);

    this.map.on("load", () => {
      log.info("map loaded");
      expect(this.onLoad).defined();
      this.onLoad && this.onLoad();
    });

    this.map.setView(this.initialCenter, this.minZoom);
  }

  highlightMarker(data){
    this.layerHighlight = new this.L.marker(
      [data.lat, data.lon],
      {
          icon: new this.L.DivIcon({
            className: "greenstand-cluster-highlight",
            html: `
              <div class="greenstand-cluster-highlight-box ${data.count > 1000? '':'small'}"  >
              <div>${Map.formatClusterText(data.count)}</div>
              </div>
            `,
          }),
      }
    );
    this.layerHighlight.addTo(this.map);
  }

}
