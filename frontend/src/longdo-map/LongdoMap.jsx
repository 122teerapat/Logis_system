import React, { Component } from "react";

export let longdo;
export let map;

export class LongdoMap extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef(); // ใช้ ref แทน document.getElementById
  }

  mapCallback() {
    if (!window.longdo) {
      console.error("Longdo Map API ยังไม่โหลดเสร็จ");
      return;
    }

    longdo = window.longdo;
    map = new window.longdo.Map({
      placeholder: this.mapRef.current, // ใช้ ref
      language: "th",
      layer: [
        longdo.Layers.GRAY,
        longdo.Layers.TRAFFIC
      ],
    });

    // รอให้ map พร้อมใช้งานก่อนเรียก callback
    if (map && typeof map.on === 'function') {
      map.on('ready', () => {
        if (this.props.callback) {
          this.props.callback(map);
        }
      });
    } else {
      console.error("map หรือ map.on ไม่ถูกกำหนดค่า");
      // ถ้าไม่สามารถใช้ map.on ได้ ให้เรียก callback ทันที
      if (this.props.callback) {
        this.props.callback(map);
      }
    }
  }

  componentDidMount() {
    const existingScript = document.getElementById("longdoMapScript");

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://api.longdo.com/map/?key=${this.props.mapKey}`;
      script.id = "longdoMapScript";
      document.body.appendChild(script);

      script.onload = () => {
        console.log("Longdo Map API Loaded");
        this.mapCallback();
      };
    } else {
      if (window.longdo) {
        this.mapCallback(); // ถ้าโหลดแล้วก็เรียกใช้เลย
      } else {
        existingScript.onload = () => this.mapCallback(); // กรณีโหลดอยู่ ให้รอ
      }
    }
  }

  render() {
    return (
      <div
        ref={this.mapRef} // ใช้ ref แทน id
        style={{ width: "100%", height: "100%" }}
      ></div>
    );
  }
}

export default LongdoMap;
