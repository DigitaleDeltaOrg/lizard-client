# (c) Nelen & Schuurmans.  GPL licensed, see LICENSE.rst.
# -*- coding: utf-8 -*-

from __future__ import print_function
from __future__ import unicode_literals

from hashlib import md5
import json
import random

from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.safestring import mark_safe
from rest_framework.renderers import JSONRenderer
from django.conf import settings

from hydra_core.models import Layer, ThreediInstance
from lizard_nxt.server.serializers import spatial


def _bootstrap(objects):
    return mark_safe(JSONRenderer().render(objects))


def index(request):
    base_layers = spatial.LayerSerializer(
        Layer.objects.filter(baselayer=True)).data
    layers = spatial.LayerSerializer(
        Layer.objects.filter(baselayer=False)).data

    context = {
        'random_string': md5(str(random.random())).hexdigest(),
        'strap_base_layers': _bootstrap(base_layers),
        'strap_layers': _bootstrap(layers),
        'threedi_instance': ThreediInstance.objects.all()[0],  # For now, just assign a server 
        # 'extent': extent,
    }
    if getattr(settings, "DEV_TEMPLATE", False):
        return render_to_response('client/debug.html', context,
                              context_instance=RequestContext(request))
    else:
        return render_to_response('client/base.html', context,
                              context_instance=RequestContext(request))


def search(request):
    context = {
        'random_string': md5(str(random.random())).hexdigest(),
    }
    return render_to_response('search/search.html', context,
                              context_instance=RequestContext(request))


def jsonp_view(request):
    data = json.dumps(request.GET.dict())
    callback_string = request.GET['callback']
    jsonp = callback_string + '(' + data + ')'
    return HttpResponse(jsonp, mimetype='application/javascript')
