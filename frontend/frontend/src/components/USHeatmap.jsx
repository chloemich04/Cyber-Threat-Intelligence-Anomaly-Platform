import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer';
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import { useThreatData, useFilters } from '../context/AppContext';

function USHeatmap() {
  const mapRef = useRef(null);
  const { threatData } = useThreatData();
  const { filters } = useFilters();

  useEffect(() => {
    let view = null;

    const initializeMap = async () => {
      try {
        // Create a map with light basemap for better contrast
        const map = new Map({
          basemap: 'gray-vector'
        });

        // Create the MapView centered on United States
        view = new MapView({
          container: mapRef.current,
          map: map,
          center: [-98.5795, 39.8283],
          zoom: 4,
          ui: {
            components: [] // Clean UI
          }
        });

        // Get state threat data from context
        const stateThreatData = threatData.stateThreatData || {};

        // Create heatmap renderer based on threat data
        const createHeatmapRenderer = () => {
          // Calculate threat values for classification
          const threatValues = Object.values(stateThreatData).map(state => state.threats || 0);
          const maxThreats = Math.max(...threatValues, 1); // Avoid division by zero
          
          return new ClassBreaksRenderer({
            field: 'threat_count',
            classBreakInfos: [
              {
                minValue: 0,
                maxValue: maxThreats * 0.2,
                symbol: new SimpleFillSymbol({
                  color: [255, 255, 178, 0.8], // Light yellow - low threat
                  outline: new SimpleLineSymbol({
                    color: [100, 100, 100, 0.8],
                    width: 1
                  })
                }),
                label: 'Low Threat'
              },
              {
                minValue: maxThreats * 0.2,
                maxValue: maxThreats * 0.4,
                symbol: new SimpleFillSymbol({
                  color: [253, 204, 138, 0.8], // Light orange
                  outline: new SimpleLineSymbol({
                    color: [100, 100, 100, 0.8],
                    width: 1
                  })
                }),
                label: 'Medium Low'
              },
              {
                minValue: maxThreats * 0.4,
                maxValue: maxThreats * 0.6,
                symbol: new SimpleFillSymbol({
                  color: [252, 141, 89, 0.8], // Orange
                  outline: new SimpleLineSymbol({
                    color: [100, 100, 100, 0.8],
                    width: 1
                  })
                }),
                label: 'Medium Threat'
              },
              {
                minValue: maxThreats * 0.6,
                maxValue: maxThreats * 0.8,
                symbol: new SimpleFillSymbol({
                  color: [227, 74, 51, 0.8], // Red
                  outline: new SimpleLineSymbol({
                    color: [100, 100, 100, 0.8],
                    width: 1
                  })
                }),
                label: 'High Threat'
              },
              {
                minValue: maxThreats * 0.8,
                maxValue: maxThreats,
                symbol: new SimpleFillSymbol({
                  color: [179, 0, 0, 0.8], // Dark red
                  outline: new SimpleLineSymbol({
                    color: [100, 100, 100, 0.8],
                    width: 1
                  })
                }),
                label: 'Very High Threat'
              }
            ]
          });
        };

        // Use a reliable US States layer from ArcGIS Online
        // This layer contains only US states with proper boundaries
        const statesLayer = new FeatureLayer({
          url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized/FeatureServer/0',
          definitionExpression: "State_Name <> 'Alaska' AND State_Name <> 'Hawaii'", // Exclude non-contiguous states
          renderer: createHeatmapRenderer(),
          popupEnabled: true,
          outFields: ['State_Name', 'State_Abbr', 'FID'],
          opacity: 0.9
        });

        // Add the states layer
        map.add(statesLayer);

        // Wait for view and layer to be ready
        await view.when();
        await statesLayer.when();

        // Function to update features with threat data
        const updateLayerWithThreatData = async () => {
          try {
            // Query all features from the layer
            const featureSet = await statesLayer.queryFeatures({
              where: '1=1',
              outFields: ['State_Name', 'State_Abbr', 'FID'],
              returnGeometry: false
            });

            // Create attributes to update
            const updates = featureSet.features.map(feature => {
              const stateName = feature.attributes.State_Name;
              const threatInfo = stateThreatData[stateName];
              const threatCount = threatInfo?.threats || 0;
              
              return {
                objectId: feature.attributes.FID || feature.attributes.OBJECTID,
                attributes: {
                  threat_count: threatCount,
                  threat_level: getThreatLevel(threatCount, Math.max(...Object.values(stateThreatData).map(s => s.threats || 0), 1))
                }
              };
            });

            // Apply updates to the layer
            if (updates.length > 0) {
              await statesLayer.applyEdits({
                updateFeatures: updates
              });
            }
          } catch (error) {
            console.warn('Could not update layer with threat data:', error);
          }
        };

        // Helper function to determine threat level
        const getThreatLevel = (count, max) => {
          const ratio = count / max;
          if (ratio === 0) return 'None';
          if (ratio <= 0.2) return 'Low';
          if (ratio <= 0.4) return 'Medium Low';
          if (ratio <= 0.6) return 'Medium';
          if (ratio <= 0.8) return 'High';
          return 'Very High';
        };

        // Set up popup template
        statesLayer.popupTemplate = {
          title: '{State_Name}',
          content: `
            <div class="popup-content">
              <div><strong>State:</strong> {State_Name}</div>
              <div><strong>Abbreviation:</strong> {State_Abbr}</div>
              <div><strong>Threat Count:</strong> {threat_count}</div>
              <div><strong>Threat Level:</strong> {threat_level}</div>
            </div>
          `
        };

        // Update layer with threat data when ready
        statesLayer.when(() => {
          updateLayerWithThreatData();
        });

        // Fit view to US extent - this layer has proper US bounds
        view.goTo({
          target: statesLayer.fullExtent
        }).catch(() => {
          // Fallback to manual US bounds
          view.goTo({
            center: [-98.5795, 39.8283],
            zoom: 4
          });
        });

        // Add hover effect
        let highlight = null;
        
        view.on('pointer-move', (event) => {
          view.hitTest(event).then((response) => {
            if (response.results.length > 0) {
              const stateResult = response.results.find(result => 
                result.graphic && result.graphic.layer === statesLayer
              );
              
              if (stateResult) {
                if (highlight) {
                  highlight.remove();
                }
                
                view.whenLayerView(statesLayer).then((layerView) => {
                  highlight = layerView.highlight([stateResult.graphic.attributes.FID || stateResult.graphic.attributes.OBJECTID]);
                });
                
                view.container.style.cursor = 'pointer';
              } else {
                if (highlight) {
                  highlight.remove();
                  highlight = null;
                }
                view.container.style.cursor = 'default';
              }
            } else {
              if (highlight) {
                highlight.remove();
                highlight = null;
              }
              view.container.style.cursor = 'default';
            }
          });
        });

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, [threatData, filters]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }} 
    />
  );
}

export default USHeatmap;