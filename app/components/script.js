/**
 * Created by vf-root on 28/6/17.
 */
'use strict';

var geocoder = new google.maps.Geocoder();

function detectIE() {
    var ua = window.navigator.userAgent;

    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        //IE 10 or older => return version number
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        //IE 11 => return version number
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    var edge = ua.indexOf('Edge/');
    if (edge > 0) {
        //Edge (IE 12+) => return version number
        return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }

    //other browser
    return false;
}

var Forecast = React.createClass({
    displayName: 'Forecast',

    getInitialState: function getInitialState() {
        return {};
    },
    render: function render() {
        return React.createElement(
            'span',
            { className: 'forecastEle' },
            this.props.item.day,
            React.createElement('br', null),
            this.props.item.low,
            '\xB0/',
            this.props.item.high,
            '\xB0'
        );
    }
});

var Front = React.createClass({
    displayName: 'Front',

    getInitialState: function getInitialState() {
        return {
            city: "", state: "", url: "", query: "", unit: "c", error: false, forecastArray: []
        };
    },
    componentDidMount: function componentDidMount() {
        this.reRender();
    },
    componentDidUpdate: function componentDidUpdate() {
        var imgSrc = this.state.results.channel["item"].description;
        imgSrc = imgSrc.replace("<![CDATA[", "").replace("]]>", "");
        var elem = document.createElement("div");
        elem.innerHTML = imgSrc;
        var imageTags = elem.getElementsByTagName("img");
        var img = imageTags[0].src;
        this.refs.code.getDOMNode().setAttribute('src', img);
    },
    successFunction: function successFunction(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        this.codeLatLng(lat, lng);
    },
    errorFunction: function errorFunction() {
        console.log("Geocoder failed");
    },
    publishData: function publishData(data) {
        if (data.query.results) {
            this.setState({ "results": data.query.results });
            this.props.loadCallback(false);
            this.getForeCastData();
        } else {
            this.setState({ "error": true });
            this.props.setError(true);
            this.props.loadCallback(false);
        }
    },
    loadAPIData: function loadAPIData() {
        var comp = this;
        this.state.query = "select * from weather.forecast where woeid in (select woeid from geo.places(1) where text='" + this.state.city.toLowerCase() + "," + this.state.state.toLowerCase() + "')and u='" + this.state.unit + "'";
        this.state.query = encodeURIComponent(this.state.query);
        this.state.url = "https://query.yahooapis.com/v1/public/yql?q=" + this.state.query + "&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithke";
        if (window.XDomainRequest && detectIE()) {
            var xdr = new XDomainRequest();
            xdr.open("GET", this.state.url, false);
            xdr.onload = function () {
                var res = JSON.parse(xdr.responseText);
                if (res == null || typeof res == 'undefined') {
                    res = JSON.parse(data.firstChild.textContent);
                }
                comp.publishData(res);
            };
            xdr.send();
        } else {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4) {
                    if (xmlhttp.status == 200 || xmlhttp.status == 304) {
                        comp.publishData(JSON.parse(xmlhttp.responseText));
                    } else {
                        setTimeout(function () {
                            console.log("Request failed!");
                        }, 0);
                    }
                }
            };

            xmlhttp.open("GET", this.state.url, true);
            xmlhttp.send();
        }
    },
    codeLatLng: function codeLatLng(lat, lng) {
        var comp = this;
        var latlng = new google.maps.LatLng(lat, lng);
        geocoder.geocode({
            'latLng': latlng
        }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[1]) {
                    //find country name
                    for (var i = 0; i < results[0].address_components.length; i++) {
                        for (var b = 0; b < results[0].address_components[i].types.length; b++) {
                            //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
                            if (results[0].address_components[i].types[b] == "administrative_area_level_2") {
                                //this is the object you are looking for
                                comp.state.city = results[0].address_components[i].long_name;
                                break;
                            }
                        }
                    }

                    for (var i = 0; i < results[0].address_components.length; i++) {
                        for (var b = 0; b < results[0].address_components[i].types.length; b++) {
                            //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
                            if (results[0].address_components[i].types[b] == "administrative_area_level_1") {
                                //this is the object you are looking for
                                comp.state.state = results[0].address_components[i].short_name;
                                break;
                            }
                        }
                    }
                    comp.loadAPIData();
                } else {
                    console.log("City name not available");
                }
            } else {
                console.log("Geocoder failed due to: ", status);
            }
        });
    },
    toggleUnit: function toggleUnit() {
        this.setState({
            unit: this.state.unit == 'c' ? 'f' : 'c'
        });

        this.reRender(this.state.city, this.state.state);
    },
    reRender: function reRender(c, s) {
        var comp = this;
        if (c) this.setState({ city: c });
        if (s) this.setState({ state: s });
        this.props.loadCallback(true);

        if (c || s) {
            setTimeout(function () {
                comp.loadAPIData();
            }, 200);
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(this.successFunction, this.errorFunction);
            }
        }
    },
    refresh: function refresh() {
        this.reRender(this.state.city, this.state.state);
    },
    getForeCastData: function getForeCastData() {
        var temps = [];
        if (this.state.results) {
            temps = this.state.results.channel.item.forecast.map(function (item, i) {
                if (i < 5) {
                    return React.createElement(Forecast, { item: item });
                }
            });
        }
        this.setState({
            forecastArray: temps
        });
    },
    render: function render() {
        return React.createElement(
            'div',
            { style: { display: !this.props.isLoading && !this.props.toggle && !this.props.isError ? "block" : "none" } },
            React.createElement(
                'div',
                { className: 'title' },
                this.state.results && this.state.results.channel.location.city,
                ',',
                this.state.results && this.state.results.channel.location.region
            ),
            React.createElement('button', { className: 'refresh', title: 'Refresh', onClick: this.refresh }),
            React.createElement(
                'div',
                { className: 'temp' },
                React.createElement(
                    'div',
                    { className: 'tempText' },
                    this.state.results && this.state.results.channel.item.condition.temp,
                    ' \xB0',
                    this.state.results && this.state.results.channel.units.temperature
                ),
                React.createElement(
                    'div',
                    { className: 'condition' },
                    React.createElement('img', { className: 'condImg', ref: 'code' }),
                    this.state.results && this.state.results.channel.item.condition.text
                ),
                React.createElement(
                    'div',
                    { className: 'unit' },
                    React.createElement(
                        'button',
                        { disabled: this.state.unit == "c", onClick: this.toggleUnit },
                        '\xB0C'
                    ),
                    React.createElement(
                        'button',
                        { disabled: this.state.unit == "f", onClick: this.toggleUnit },
                        '\xB0F'
                    )
                )
            ),
            React.createElement(
                'div',
                { className: 'forecastCont' },
                this.state.forecastArray
            )
        );
    }
});

var Form = React.createClass({
    displayName: 'Form',

    getInitialState: function getInitialState() {
        return {};
    },
    handleSubmit: function handleSubmit(e) {
        e.preventDefault();
        var inputCity = ReactDOM.findDOMNode(this.refs.city);
        var inputState = ReactDOM.findDOMNode(this.refs.state);

        if (inputCity.value && inputState.value) {
            this.props.onFormSubmit(inputCity.value, inputState.value);
        }
    },
    setErrorFn: function setErrorFn() {
        this.props.setError(false);
    },
    render: function render() {
        return React.createElement(
            'div',
            null,
            React.createElement(
                'form',
                { onSubmit: this.handleSubmit, style: { display: !this.props.isLoading && this.props.toggle ? "block" : "none" } },
                React.createElement('input', { placeholder: 'Enter city name here', ref: 'city', type: 'text', onClick: this.setErrorFn, onKeyDown: this.setErrorFn }),
                React.createElement('input', { placeholder: 'Enter state name here', ref: 'state', type: 'text', onClick: this.setErrorFn, onKeyDown: this.setErrorFn }),
                React.createElement(
                    'div',
                    null,
                    React.createElement('input', { type: 'submit', value: 'Submit' })
                )
            ),
            React.createElement(
                'div',
                { style: { display: this.props.isError ? "block" : "none" } },
                React.createElement(
                    'span',
                    { className: 'error' },
                    'Error while fetching data. You can try by changing the details.'
                )
            )
        );
    }
});

var Spinner = React.createClass({
    displayName: 'Spinner',

    getInitialState: function getInitialState() {
        return {};
    },
    render: function render() {
        return React.createElement('div', { className: 'loader', style: { display: this.props.isLoading ? "block" : "none" } });
    }
});

var ChangeBtn = React.createClass({
    displayName: 'ChangeBtn',

    getInitialState: function getInitialState() {
        return {
            showForm: false
        };
    },
    toggleForm: function toggleForm() {
        this.state.showForm = !this.state.showForm;
        this.props.toggleForm(this.state.showForm);
    },
    render: function render() {
        return React.createElement(
            'button',
            { className: 'edit', title: 'Change Location', onClick: this.toggleForm, style: { display: this.props.isLoading && !this.props.isError ? "none" : "block" } },
            this.state.showForm ? "Back" : "Change Location"
        );
    }
});

var Main = React.createClass({
    displayName: 'Main',

    getInitialState: function getInitialState() {
        return {
            isLoading: true,
            toggleForm: false,
            isError: false
        };
    },
    setError: function setError(value) {
        this.setState({ isError: value });
    },
    changeLoading: function changeLoading(value) {
        this.setState({ isLoading: value });
    },
    onToggleForm: function onToggleForm(value) {
        this.setState({ toggleForm: value });
    },
    onFormSubmit: function onFormSubmit(c, s) {
        this.onToggleForm(false);
        this.refs.change.toggleForm();
        this.refs.front.reRender(c, s);
        this.setState({ isError: false });
    },
    render: function render() {
        return React.createElement(
            'div',
            { id: 'weather', className: 'weather' },
            React.createElement(ChangeBtn, { ref: 'change', isLoading: this.state.isLoading, toggleForm: this.onToggleForm }),
            React.createElement(Front, { ref: 'front', isLoading: this.state.isLoading, isError: this.state.isError, setError: this.setError, loadCallback: this.changeLoading, toggle: this.state.toggleForm }),
            React.createElement(Form, { isLoading: this.state.isLoading, toggle: this.state.toggleForm, onFormSubmit: this.onFormSubmit, isError: this.state.isError, setError: this.setError }),
            React.createElement(Spinner, { isLoading: this.state.isLoading })
        );
    }
});

ReactDOM.render(React.createElement(Main, null), document.getElementById("weather-app"));